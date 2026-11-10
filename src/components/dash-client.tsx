"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BENCHMARK } from "@/lib/kpi";

/** Dropdown filter that updates the page's URL as soon as a value is chosen ("Departments: All"). */
export function UrlSelect({ name, label, value, options, allLabel = "All" }: { name: string; label: string; value: string; options: { value: string; label: string }[]; allLabel?: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <label className="relative inline-flex w-full min-w-0 items-center rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm tracking-wide sm:w-auto sm:min-w-56">
      <span className="shrink-0 font-display text-black">{label}:</span>
      <select
        name={name}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set(name, e.target.value);
          else next.delete(name);
          next.delete("page");
          const s = next.toString();
          router.push(s ? `${path}?${s}` : path, { scroll: false });
        }}
        className="w-full min-w-0 cursor-pointer appearance-none bg-transparent pl-1.5 pr-6 font-display text-black outline-none"
      >
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-4 text-[10px]">▼</span>
    </label>
  );
}

const fmt = (v: unknown) => (typeof v === "number" ? `${Math.round(v)}%` : "—");

/** "Weekly Performance Score": striped grey columns with the 80% benchmark line. */
export function ScoreColumns({ data }: { data: { label: string; value: number | null }[] }) {
  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <pattern id="score-stripes" width="6" height="4" patternUnits="userSpaceOnUse">
              <rect width="6" height="4" fill="#d4d4d4" />
              <rect width="6" height="1.5" fill="#a3a3a3" />
            </pattern>
          </defs>
          <CartesianGrid stroke="#ececec" strokeDasharray="2 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#bdbdbd" }} tick={{ fill: "#333", fontSize: 12 }} />
          <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fill: "#333", fontSize: 12 }} />
          <Tooltip formatter={(v) => [fmt(v), "Score"]} cursor={{ fill: "#f5f5f5" }} />
          <ReferenceLine y={BENCHMARK} stroke="#8a8a8a" strokeDasharray="6 4" label={{ value: `${BENCHMARK}% Benchmark`, position: "insideTopLeft", fill: "#555", fontSize: 11 }} />
          <Bar dataKey="value" fill="url(#score-stripes)" stroke="#8a8a8a" strokeWidth={1} maxBarSize={72} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" formatter={(v: unknown) => (typeof v === "number" ? Math.round(v) : "")} style={{ fill: "#333", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** "Top 5 Performing Dept.": horizontal grey bars, 0–100. */
export function DeptBars({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-neutral-600">No KPI results recorded yet.</p>;
  return (
    <div className="w-full" style={{ height: 56 * data.length + 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="#ececec" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickLine={false} axisLine={false} tick={{ fill: "#333", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: "#333", fontSize: 12 }} />
          <Tooltip formatter={(v) => [fmt(v), "KPI achievement"]} cursor={{ fill: "#f5f5f5" }} />
          <Bar dataKey="value" fill="#9e9e9e" radius={[4, 4, 4, 4]} barSize={18} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => (typeof v === "number" ? Math.round(v) : "")} style={{ fill: "#333", fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
