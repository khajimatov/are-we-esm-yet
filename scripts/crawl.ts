/**
 * Daily ESM crawl: fetch npm-high-impact packages, classify, write data + index.csv
 * Adapted from wooorm/npm-esm-vs-cjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import dotenv from "dotenv";
import { npmHighImpact } from "npm-high-impact";
import pacote from "pacote";

dotenv.config();

export type Style = "esm" | "dual" | "faux" | "cjs";

interface ExportsState {
  cjs?: boolean;
  esm?: boolean;
  fauxEsm: boolean;
}

interface PackageVersion {
  name?: string;
  repository?: string;
  readme?: string;
  description?: string;
  _npmUser?: { name: string };
  module?: string;
  main?: string;
  type?: string;
  exports?: unknown;
}

interface Packument {
  name?: string;
  "dist-tags"?: { latest?: string };
  versions?: Record<string, PackageVersion>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const token = process.env.NPM_TOKEN;

if (!token) {
  console.error("Warning: NPM_TOKEN not set. npm may rate-limit. Set it in .env or CI secrets.");
}

const BATCH_SIZE = 20;
const now = new Date();
const dateStr = now.toISOString().slice(0, 10);

const dataDir = path.join(__dirname, "..", "data");
const destination = path.join(dataDir, `${dateStr}.json`);
const indexPath = path.join(__dirname, "..", "index.csv");

const allResults: Record<string, Style | undefined> = {};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function analyzeThing(value: unknown, state: ExportsState): void {
  if (value && typeof value === "object") {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        analyzeThing(value[i], state);
      }
    } else {
      const record = value as Record<string, unknown>;
      let dots = false;
      for (const [key, subvalue] of Object.entries(record)) {
        if (key.charAt(0) !== ".") break;
        analyzeThing(subvalue, state);
        dots = true;
      }
      if (dots) return;

      const conditionImport = Boolean("import" in record && record.import);
      const conditionRequire = Boolean("require" in record && record.require);
      const conditionDefault = Boolean("default" in record && record.default);
      const explicit = conditionImport || conditionRequire;

      if (conditionImport || (conditionRequire && conditionDefault)) {
        state.esm = true;
      }
      if (conditionRequire || (conditionImport && conditionDefault)) {
        state.cjs = true;
      }

      const defaults = record.node ?? record.default;
      if (typeof defaults === "string" && !explicit) {
        if (defaults.endsWith(".mjs")) state.esm = true;
        if (defaults.endsWith(".cjs")) state.cjs = true;
      }
    }
  } else if (typeof value === "string") {
    if (value.endsWith(".mjs")) state.esm = true;
    if (value.endsWith(".cjs")) state.cjs = true;
  }
}

function analyzePackument(result: Packument): Style | undefined {
  const latest = (result["dist-tags"] ?? {}).latest;
  if (!latest) return undefined;

  const pkg = (result.versions ?? {})[latest];
  if (!pkg) return undefined;

  if (typeof pkg.repository === "string" && pkg.repository === "npm/security-holder") {
    return undefined;
  }

  if (
    (pkg.readme && pkg.readme.length < 100 && /tea protocol/.test(pkg.readme)) ||
    /tea protocol/.test(pkg.description ?? "") ||
    /tea\.xyz/.test(pkg.description ?? "") ||
    /^tea-?[a-z\d]+$/.test(pkg.name ?? "")
  ) {
    return undefined;
  }

  if (pkg.description?.startsWith("This is a [Next.js](https://nextjs.org/) project")) {
    return undefined;
  }

  if (/^sum-[a-z\d]+$/.test(pkg.name ?? "")) return undefined;

  const spamAuthors = [
    "alexkingmax",
    "doelsumbing87",
    "herzxxvi",
    "hoangthuylinh",
    "jarwok",
    "jazuli",
    "lank831011",
    "manhcuongsev",
    "ramunakea",
    "tinhkhucvang",
    "tinhmotdem",
    "vanli",
    "walletelectorsim",
  ];
  if (
    pkg._npmUser &&
    (spamAuthors.includes(pkg._npmUser.name) ||
      /^haquang\d+$/.test(pkg._npmUser.name) ||
      /^haquanghuy\d+$/.test(pkg._npmUser.name) ||
      /^quanghuyha\d+$/.test(pkg._npmUser.name))
  ) {
    return undefined;
  }

  const state: ExportsState = { cjs: undefined, esm: undefined, fauxEsm: false };

  if (pkg.module) state.fauxEsm = true;

  if (pkg.exports) {
    analyzeThing(pkg.exports, state);
  }

  if (state.esm && pkg.type === "commonjs") state.cjs = true;
  if (state.cjs && pkg.type === "module") state.esm = true;

  if (state.cjs === undefined && state.esm === undefined) {
    if (pkg.type === "module" || (pkg.main && pkg.main.endsWith(".mjs"))) {
      state.esm = true;
    } else {
      state.cjs = true;
    }
  }

  if (state.esm && state.cjs) return "dual";
  if (state.esm) return "esm";
  if (state.fauxEsm) return "faux";
  return "cjs";
}

async function main(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });

  console.error("Fetching %d packages", npmHighImpact.length);

  let slice = 0;
  while (true) {
    const names = npmHighImpact.slice(slice * BATCH_SIZE, (slice + 1) * BATCH_SIZE);
    if (names.length === 0) break;

    console.error(
      "Fetching page: %d, collected: %d / %d",
      slice,
      slice * BATCH_SIZE,
      npmHighImpact.length,
    );

    const promises = names.map(async (name: string) => {
      try {
        const result = (await pacote.packument(name, {
          fullMetadata: true,
          preferOffline: true,
          ...(token && { token }),
        })) as Packument;
        const style = analyzePackument(result);
        return [name, style] as const;
      } catch (err) {
        console.error("Package error: %s - %s", name, (err as Error).message);
        return [name, undefined] as const;
      }
    });

    let results: readonly (readonly [string, Style | undefined])[];
    try {
      results = await Promise.all(promises);
    } catch (err) {
      console.error(err);
      console.error("Sleeping 10s…");
      await sleep(10_000);
      continue;
    }

    for (const [name, style] of results) {
      allResults[name] = style;
      if (style) console.error("  add: %s (%s)", name, style);
    }

    await fs.writeFile(destination, JSON.stringify(allResults, null, 2) + "\n");

    slice++;
  }

  const counts = { esm: 0, dual: 0, faux: 0, cjs: 0 };
  for (const style of Object.values(allResults)) {
    if (style && style in counts) counts[style as keyof typeof counts]++;
  }
  const total = counts.esm + counts.dual + counts.faux + counts.cjs;
  const newRow = `${dateStr},${total},${counts.esm},${counts.dual},${counts.faux},${counts.cjs}\n`;

  let existingCsv: string;
  try {
    existingCsv = await fs.readFile(indexPath, "utf8");
  } catch {
    existingCsv = "date,total,esm,dual,faux,cjs\n";
  }

  const hasDate = existingCsv.trim().split("\n").some((line) => line.startsWith(dateStr + ","));
  if (!hasDate) {
    await fs.writeFile(
      indexPath,
      existingCsv + (existingCsv.endsWith("\n") ? "" : "\n") + newRow,
    );
  }

  const files = await fs.readdir(dataDir);
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    const fileDate = new Date(m[1] + "T00:00:00Z");
    if (fileDate < cutoff) {
      await fs.unlink(path.join(dataDir, f)).catch(() => {});
      console.error("Pruned old file: %s", f);
    }
  }

  console.error(
    "Done! total=%d esm=%d dual=%d faux=%d cjs=%d",
    total,
    counts.esm,
    counts.dual,
    counts.faux,
    counts.cjs,
  );
}

await main();
