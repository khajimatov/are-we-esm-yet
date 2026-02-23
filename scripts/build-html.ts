/**
 * Build single index.html from index.csv
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

interface TrendRow {
  date: string;
  total: number;
  esm: number;
  dual: number;
  faux: number;
  cjs: number;
}

function parseCsv(content: string): TrendRow[] {
  const lines = content.trim().split("\n");
  if (!lines[0]?.startsWith("date,")) return [];
  const rows: TrendRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 6) continue;
    rows.push({
      date: parts[0],
      total: parseInt(parts[1], 10) || 0,
      esm: parseInt(parts[2], 10) || 0,
      dual: parseInt(parts[3], 10) || 0,
      faux: parseInt(parts[4], 10) || 0,
      cjs: parseInt(parts[5], 10) || 0,
    });
  }
  return rows;
}

function esmReadyPercent(row: TrendRow): number {
  const ready = row.esm + row.dual;
  return row.total > 0 ? Math.round((ready / row.total) * 100) : 0;
}

async function build(): Promise<void> {
  const csvPath = path.join(ROOT, "index.csv");
  const content = await fs.readFile(csvPath, "utf8");
  const rows = parseCsv(content);
  const latest = rows.at(-1);
  if (!latest) {
    throw new Error("No data in index.csv");
  }

  const pct = esmReadyPercent(latest);
  const pcts = {
    esm: (latest.esm / latest.total) * 100,
    dual: (latest.dual / latest.total) * 100,
    faux: (latest.faux / latest.total) * 100,
    cjs: (latest.cjs / latest.total) * 100,
  };

  const chartData = {
    labels: rows.map((r) => r.date.slice(0, 7)),
    datasets: [
      { label: "CJS", data: rows.map((r) => r.cjs), color: "#6b7280" },
      { label: "faux", data: rows.map((r) => r.faux), color: "#f59e0b" },
      { label: "dual", data: rows.map((r) => r.dual), color: "#3b82f6" },
      { label: "ESM", data: rows.map((r) => r.esm), color: "#22c55e" },
    ],
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="ESM adoption dashboard for the JavaScript/TypeScript ecosystem">
  <title>Are we ESM yet?</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg: #0a0a0b;
      --surface: #141416;
      --border: #27272a;
      --muted: #a1a1aa;
      --accent: #22c55e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg);
      color: #fafafa;
      font-family: "DM Sans", system-ui, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    main {
      max-width: 720px;
      margin: 0 auto;
      padding: 3rem 1.5rem 4rem;
    }
    header { text-align: center; margin-bottom: 2.5rem; }
    h1 {
      margin: 0;
      font-size: 2.25rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      background: linear-gradient(to bottom right, #fafafa, #a1a1aa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle { margin: 0.5rem 0 1.5rem; color: var(--muted); font-size: 1.125rem; }
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 1.5rem 2rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      margin: 0 auto 1rem;
      max-width: 420px;
    }
    .hero-value { font-size: 2.25rem; font-weight: 700; font-family: "JetBrains Mono", monospace; color: var(--accent); }
    .hero-label { color: var(--muted); font-size: 0.95rem; }
    .updated { margin: 0; color: var(--muted); font-size: 0.875rem; opacity: 0.8; }
    section { margin-top: 2rem; }
    h2 {
      margin: 0 0 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .bar-container {
      display: flex;
      height: 2rem;
      border-radius: 0.5rem;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
    }
    .bar-segment { transition: width 0.3s ease-out; }
    .bar-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.75rem;
      font-size: 0.875rem;
      color: var(--muted);
    }
    .bar-legend span { display: flex; align-items: center; gap: 0.375rem; }
    .bar-legend .dot { width: 10px; height: 10px; border-radius: 2px; }
    .chart-wrap {
      margin-bottom: 0.5rem;
      overflow-x: auto;
    }
    .chart-wrap canvas { max-width: 100%; }
    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--muted);
    }
    .chart-legend span { display: flex; align-items: center; gap: 0.375rem; }
    .chart-legend .dot { width: 10px; height: 10px; border-radius: 2px; }
    .chart-note { margin: 0.5rem 0 0; font-size: 0.75rem; color: var(--muted); }
    #glossary {
      margin-top: 3rem;
      padding: 1.5rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
    }
    #glossary dl { margin: 0; display: grid; gap: 0.75rem; }
    #glossary dt { margin: 0; font-weight: 600; }
    #glossary dd { margin: 0; color: var(--muted); font-size: 0.875rem; line-height: 1.5; }
    #glossary code {
      font-size: 0.9em;
      padding: 0.125rem 0.375rem;
      background: var(--bg);
      border-radius: 0.25rem;
    }
    .glossary-row { display: grid; grid-template-columns: 4rem 1fr; gap: 1rem; align-items: start; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Are we ESM yet?</h1>
      <p class="subtitle">ESM adoption across high-impact npm packages</p>
      <div class="hero">
        <span class="hero-value">${pct}%</span>
        <span class="hero-label">of high-impact npm packages are ESM-ready</span>
      </div>
      <p class="updated">Last updated: ${latest.date}</p>
    </header>

    <section>
      <h2>Adoption breakdown</h2>
      <div class="bar-container">
        <div class="bar-segment" style="width: ${pcts.esm}%; background: #22c55e" title="ESM: ${latest.esm} (${Math.round(pcts.esm)}%)"></div>
        <div class="bar-segment" style="width: ${pcts.dual}%; background: #3b82f6" title="dual: ${latest.dual} (${Math.round(pcts.dual)}%)"></div>
        <div class="bar-segment" style="width: ${pcts.faux}%; background: #f59e0b" title="faux: ${latest.faux} (${Math.round(pcts.faux)}%)"></div>
        <div class="bar-segment" style="width: ${pcts.cjs}%; background: #6b7280" title="CJS: ${latest.cjs} (${Math.round(pcts.cjs)}%)"></div>
      </div>
      <div class="bar-legend">
        <span><span class="dot" style="background:#22c55e"></span> ESM ${Math.round(pcts.esm)}%</span>
        <span><span class="dot" style="background:#3b82f6"></span> dual ${Math.round(pcts.dual)}%</span>
        <span><span class="dot" style="background:#f59e0b"></span> faux ${Math.round(pcts.faux)}%</span>
        <span><span class="dot" style="background:#6b7280"></span> CJS ${Math.round(pcts.cjs)}%</span>
      </div>
    </section>

    <section>
      <h2>Trend over time</h2>
      <div class="chart-wrap">
        <canvas id="trendChart" height="280"></canvas>
      </div>
      <div class="chart-legend">
        <span><span class="dot" style="background:#22c55e"></span> ESM</span>
        <span><span class="dot" style="background:#3b82f6"></span> dual</span>
        <span><span class="dot" style="background:#f59e0b"></span> faux</span>
        <span><span class="dot" style="background:#6b7280"></span> CJS</span>
      </div>
      <p class="chart-note">ESM-ready = ESM + dual packages. Data from 2021 to present.</p>
    </section>

    <section id="glossary">
      <h2>Glossary</h2>
      <dl>
        <div class="glossary-row">
          <dt><code>ESM</code></dt>
          <dd>ECMAScript Modules. Package has \`type: 'module'\` or \`.mjs\` entry point. Native \`import\`/\`export\` in Node.js.</dd>
        </div>
        <div class="glossary-row">
          <dt><code>dual</code></dt>
          <dd>Package provides both ESM and CJS via \`exports\` conditions (\`import\` and \`require\`). Works in either environment.</dd>
        </div>
        <div class="glossary-row">
          <dt><code>faux</code></dt>
          <dd>Legacy "module" field for old bundlers (e.g. webpack). Not true Node ESM; no \`type: 'module'\` or proper \`exports\`.</dd>
        </div>
        <div class="glossary-row">
          <dt><code>CJS</code></dt>
          <dd>CommonJS. Default for npm packages. Uses \`require()\`/\`module.exports\`.</dd>
        </div>
      </dl>
    </section>
  </main>

  <script>
    const chartData = ${JSON.stringify(chartData)};
    const ctx = document.getElementById('trendChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.color + 'cc',
          borderColor: ds.color,
          borderWidth: 1,
          fill: true,
          tension: 0.2,
          order: chartData.datasets.length - i,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            ticks: {
              color: '#a1a1aa',
              font: { size: 10 },
              maxRotation: 0,
            },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(161,161,170,0.2)' },
            ticks: {
              color: '#a1a1aa',
              font: { size: 10 },
            },
          },
        },
      },
    });
  </script>
</body>
</html>
`;

  const outDir = path.join(ROOT, "dist");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "index.html"), html, "utf8");
  console.log("Built dist/index.html");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
