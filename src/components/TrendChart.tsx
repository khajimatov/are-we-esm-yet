import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useId } from "react";
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
  const a11yId = useId().replace(/:/g, "");
  const titleId = `trend-chart-title-${a11yId}`;
  const descriptionId = `trend-chart-description-${a11yId}`;
  if (data.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Trend
        </h2>
        <div className="flex min-h-[240px] items-center justify-center border border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">No trend data yet</p>
        </div>
        <p className="m-0 text-center text-xs text-muted-foreground">
          ESM-ready = ESM-only + dual packages
        </p>
      </section>
    );
  }
  const latestPoint = data[data.length - 1];
  const latestDate = latestPoint?.date;
  const latestEsmReadyPct = Math.round(latestPoint?.esmReadyPct ?? 0);
  const latestEsmReadyCount = (latestPoint?.esm ?? 0) + (latestPoint?.dual ?? 0);
  const latestTotal = latestPoint?.total ?? 0;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="m-0 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Trend
      </h2>
      <p id={descriptionId} className="sr-only">
        Area chart of ESM-ready package percentage over time. Latest point: {latestDate},{" "}
        {latestEsmReadyPct}% ESM-ready, which is {latestEsmReadyCount.toLocaleString()} of{" "}
        {latestTotal.toLocaleString()} total packages.
      </p>
      <ul className="sr-only" aria-label="Trend data points">
        {data.map((point) => {
          const esmReadyCount = point.esm + point.dual;
          return (
            <li key={point.date}>
              {point.date}: {Math.round(point.esmReadyPct)}% ESM-ready ({esmReadyCount.toLocaleString()} of{" "}
              {point.total.toLocaleString()} packages)
            </li>
          );
        })}
      </ul>
      <div className="overflow-x-auto">
        <ChartContainer
          config={chartConfig}
          className="min-h-[240px] w-full"
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <AreaChart data={data} margin={{ left: 0, right: 0 }} aria-hidden="true">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (value ? value.slice(0, 7) : value)}
            />
            <YAxis
              width={40}
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
                  <div className="border-border/50 bg-background min-w-fit border px-3 py-2.5 text-xs shadow-xl flex flex-col gap-2">
                    <div className="border-b border-border/50 pb-2">
                      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                        Date
                      </div>
                      <div className="font-medium">{dateStr}</div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">ESM-ready</span>
                      <span className="font-mono font-medium tabular-nums">
                        {esmReadyPct}% ({esmReady.toLocaleString()} packages)
                      </span>
                    </div>
                    <div className="border-t border-border/50 pt-2 flex justify-between text-muted-foreground">
                      <span>Total</span>
                      <span className="font-mono font-medium tabular-nums">
                        {total.toLocaleString()} packages
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
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <p className="m-0 text-center text-xs text-muted-foreground">
        ESM-ready = ESM-only + dual packages
      </p>
    </section>
  );
}
