"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BENCHMARK } from "@/lib/kpi";

const INK_MUTED = "#6f655d";
const GRID = "#ece6db";
const BAR = "#5b3f2e"; // brand brown — single series, so one colour and no legend
const SERIES = {
  attendance: { label: "Attendance", color: "#2a78d6" },
  kpi: { label: "KPI achievement", color: "#eb6834" },
  reporting: { label: "Reporting", color: "#1baf7a" },
} as const;
export type SeriesKey = keyof typeof SERIES;

const fmt = (v: unknown) => (typeof v === "number" ? `${v.toFixed(0)}%` : "—");

function BenchmarkLine({ axis }: { axis: "x" | "y" }) {
  const props = axis === "x" ? { x: BENCHMARK } : { y: BENCHMARK };
  return (
    <ReferenceLine
      {...props}
      stroke={INK_MUTED}
      strokeDasharray="4 4"
      strokeWidth={1}
      label={{ value: `${BENCHMARK}% benchmark`, position: axis === "x" ? "top" : "insideTopRight", fill: INK_MUTED, fontSize: 11 }}
    />
  );
}

function TableView({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted hover:text-brand">View as table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} className="border-b border-line px-2 py-1 font-semibold text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="border-b border-line/60 px-2 py-1 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Horizontal bars comparing one percentage across teams/people, with the 80% benchmark. */
export function ComparisonBars({ data, metric }: { data: { name: string; value: number | null }[]; metric: string }) {
  const rows = data.map((d) => ({ name: d.name, value: d.value === null ? null : Math.round(d.value * 10) / 10 }));
  const height = Math.max(160, rows.length * 34 + 40);
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${metric} by team, compared with the ${BENCHMARK}% benchmark`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 18, right: 24, left: 4, bottom: 0 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: "#2a211b" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [fmt(v), metric]} cursor={{ fill: "#f3ede3" }} />
            <Bar dataKey="value" fill={BAR} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
            <BenchmarkLine axis="x" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView headers={["Name", metric]} rows={rows.map((r) => [r.name, fmt(r.value)])} />
    </div>
  );
}

/** Weekly trend of up to three percentage measures on one 0–100% axis. */
export function TrendChart({
  data,
  series = ["attendance", "kpi", "reporting"],
}: {
  data: { label: string; attendance: number | null; kpi: number | null; reporting: number | null }[];
  series?: SeriesKey[];
}) {
  const rows = data.map((d) => ({
    ...d,
    attendance: d.attendance === null ? null : Math.round(d.attendance),
    kpi: d.kpi === null ? null : Math.round(d.kpi),
    reporting: d.reporting === null ? null : Math.round(d.reporting),
  }));
  return (
    <div>
      <div className="h-64" role="img" aria-label={`Weekly trend: ${series.map((s) => SERIES[s].label).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, name) => [fmt(v), name]} />
            {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#2a211b" }} />}
            <BenchmarkLine axis="y" />
            {series.map((s) => (
              <Line
                key={s}
                type="linear"
                dataKey={s}
                name={SERIES[s].label}
                stroke={SERIES[s].color}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: SERIES[s].color }}
                activeDot={{ r: 5 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView headers={["Week", ...series.map((s) => SERIES[s].label)]} rows={rows.map((r) => [r.label, ...series.map((s) => fmt(r[s]))])} />
    </div>
  );
}
