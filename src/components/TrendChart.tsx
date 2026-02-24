"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

export interface ChartDataPoint {
  date: string;
  total: number;
  esm: number;
  dual: number;
  faux: number;
  cjs: number;
  esmReadyPct: number;
}

interface TrendChartProps {
  data: ChartDataPoint[];
}

const chartConfig = {
  esmReadyPct: { label: "ESM-ready", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <section>
        <h2 className="m-0 mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Trend
        </h2>
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">No trend data yet</p>
        </div>
        <p className="m-0 mt-2 text-center text-xs text-muted-foreground">
          ESM-ready = ESM + dual packages
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="m-0 mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Trend
      </h2>
      <div className="mb-2 overflow-x-auto">
        <ChartContainer config={chartConfig} className="min-h-[240px] w-full">
          <AreaChart data={data} margin={{ left: 0, right: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (value ? value.slice(0, 7) : value)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length || !label) return null;
                const d = new Date(label + "T00:00:00");
                const dateStr = isNaN(d.getTime())
                  ? label
                  : d.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                const row = payload[0]?.payload as ChartDataPoint;
                const total = row?.total ?? 0;
                const esmReady = (row?.esm ?? 0) + (row?.dual ?? 0);
                const esmReadyPct = Math.round(row?.esmReadyPct ?? 0);
                return (
                  <div className="border-border/50 bg-background min-w-[11rem] rounded-lg border px-3 py-2.5 text-xs shadow-xl">
                    <div className="mb-2 border-b border-border/50 pb-2">
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                        Date
                      </div>
                      <div className="font-medium">{dateStr}</div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">ESM-ready</span>
                      <span className="font-mono font-medium tabular-nums">{esmReadyPct}%</span>
                    </div>
                    <div className="mt-2 border-t border-border/50 pt-2 flex justify-between text-muted-foreground">
                      <span>Total</span>
                      <span className="font-mono font-medium tabular-nums">
                        {total.toLocaleString()} packages
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-muted-foreground">
                      <span>ESM + dual</span>
                      <span className="font-mono font-medium tabular-nums">
                        {esmReady.toLocaleString()} packages
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="esmReadyPct"
              stroke="var(--color-esmReadyPct)"
              fill="var(--color-esmReadyPct)"
              fillOpacity={0.4}
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <p className="m-0 mt-2 text-center text-xs text-muted-foreground">
        ESM-ready = ESM + dual packages
      </p>
    </section>
  );
}
