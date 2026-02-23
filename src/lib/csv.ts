export interface TrendRow {
  date: string;
  total: number;
  esm: number;
  dual: number;
  faux: number;
  cjs: number;
}

export function parseCsv(content: string): TrendRow[] {
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

export function esmReadyPercent(row: TrendRow): number {
  const ready = row.esm + row.dual;
  return row.total > 0 ? Math.round((ready / row.total) * 100) : 0;
}
