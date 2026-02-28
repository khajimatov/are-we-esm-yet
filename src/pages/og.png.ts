import type { APIRoute } from "astro";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "../lib/csv";

const WIDTH = 1200;
const HEIGHT = 630;
const CHART_VB_W = 1000;
const CHART_VB_H = 400;
const GREEN = "#34d399";
const BG = "#0f0f0f";

function buildChartPaths(rows: ReturnType<typeof parseCsv>) {
  const data = rows.map((r) => {
    const total = r.total || 1;
    return ((r.esm + r.dual) / total) * 100;
  });

  const points = data.map((pct, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * CHART_VB_W,
    y: CHART_VB_H - (pct / 100) * CHART_VB_H,
  }));

  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaD = `${lineD} L${CHART_VB_W} ${CHART_VB_H} L0 ${CHART_VB_H} Z`;

  return { lineD, areaD };
}

export const GET: APIRoute = async () => {
  const csvPath = path.join(process.cwd(), "index.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const { lineD, areaD } = buildChartPaths(rows);

  const fontsDir = path.join(process.cwd(), "src/assets/fonts");
  const fontRegular = fs.readFileSync(path.join(fontsDir, "JetBrainsMono-Regular.ttf"));
  const fontBold = fs.readFileSync(path.join(fontsDir, "JetBrainsMono-Bold.ttf"));

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: BG,
          fontFamily: "JetBrains Mono",
          padding: "50px 60px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                fontSize: 52,
                fontWeight: 700,
                color: "#fafafa",
                letterSpacing: "-0.02em",
              },
              children: "Are We ESM Yet?",
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexGrow: 1,
                marginTop: 30,
                marginBottom: 20,
              },
              children: {
                type: "svg",
                props: {
                  viewBox: `0 0 ${CHART_VB_W} ${CHART_VB_H}`,
                  width: "100%",
                  height: "100%",
                  preserveAspectRatio: "none",
                  children: [
                    {
                      type: "path",
                      props: { d: areaD, fill: GREEN, fillOpacity: 0.3 },
                    },
                    {
                      type: "path",
                      props: {
                        d: lineD,
                        stroke: GREEN,
                        strokeWidth: 3,
                        fill: "none",
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "center",
                fontSize: 20,
                color: "#737373",
              },
              children: "areweesmyet.com",
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "JetBrains Mono",
          data: fontRegular,
          weight: 400,
          style: "normal" as const,
        },
        {
          name: "JetBrains Mono",
          data: fontBold,
          weight: 700,
          style: "normal" as const,
        },
      ],
    },
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const png = resvg.render().asPng();

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
