// Building blocks for the Figma dashboards (Team Overview, Team Reviews, Performance Review).
import Link from "next/link";
import { BENCHMARK } from "@/lib/kpi";
import { cn } from "@/lib/utils";

type Params = Record<string, string | string[] | undefined>;

/** Link to the same page with some search params changed (empty value removes it). Resets paging unless `page` is set. */
export function hrefWith(path: string, params: Params, changes: Record<string, string>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val && k !== "page") next.set(k, val);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v) next.set(k, v);
    else next.delete(k);
  }
  const s = next.toString();
  return s ? `${path}?${s}` : path;
}

export function DashHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-medium tracking-wide text-black sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm tracking-[0.08em] text-neutral-700">{description}</p>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>;
}

export function StatCard({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5">
      <p className="max-w-[8rem] text-sm leading-snug text-neutral-700 sm:text-base">{label}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-2">
        <p className="font-display text-2xl font-semibold text-black sm:text-3xl">{value}</p>
        {note && <p className="pb-1 text-xs text-neutral-600">{note}</p>}
      </div>
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-4 sm:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-medium tracking-wide text-black sm:text-xl">{title}</h2>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Pill-shaped tab links (Weekly / Monthly, All / Active / Inactive). */
export function Tabs({ items, active }: { items: { label: string; href: string; value: string }[]; active: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          scroll={false}
          aria-current={t.value === active ? "page" : undefined}
          className={cn(
            "rounded-xl border px-3 py-1.5 text-xs tracking-wide transition-colors sm:text-sm",
            t.value === active ? "border-transparent bg-[#e0e0e0] text-black" : "border-[#e5e5e5] bg-white text-neutral-700 hover:bg-[#f3f3f3]",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-full border border-[#e5e5e5] bg-[#f5f5f5] px-3 py-0.5 text-xs tracking-wide text-black">{children}</span>;
}

/** Table with the Figma look: plain header row, grey zebra rows, horizontal scroll on small screens. */
export function DashTable({ head, children, minWidth = 640 }: { head: string[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-separate border-spacing-y-1.5 text-sm" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 pb-2 text-left font-display text-sm font-normal tracking-wide text-black">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(odd)>td]:bg-[#f7f7f7] [&>tr>td:first-child]:rounded-l-xl [&>tr>td:last-child]:rounded-r-xl">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-4 py-3.5 tracking-wide text-black", className)}>{children}</td>;
}

export function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="rounded-xl px-4 py-10 text-center text-sm text-neutral-600">{children}</td>
    </tr>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  // Show up to 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm";
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-end gap-1">
      {page > 1 ? <Link href={href(page - 1)} scroll={false} className={cn(btn, "hover:bg-[#f3f3f3]")}>‹ Previous</Link> : <span className={cn(btn, "text-neutral-400")}>‹ Previous</span>}
      {nums.map((n) => (
        <Link key={n} href={href(n)} scroll={false} aria-current={n === page ? "page" : undefined} className={cn(btn, n === page ? "bg-[#d9d9d9] font-semibold" : "hover:bg-[#f3f3f3]")}>
          {n}
        </Link>
      ))}
      {page < pages ? <Link href={href(page + 1)} scroll={false} className={cn(btn, "hover:bg-[#f3f3f3]")}>Next ›</Link> : <span className={cn(btn, "text-neutral-400")}>Next ›</span>}
    </nav>
  );
}

/** Progress ring for one percentage, with "On Track" / "Below benchmark" under it. */
export function Ring({ label, value }: { label: string; value: number | null }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  const status = value === null ? "No data yet" : value >= BENCHMARK ? "On Track" : "Below benchmark";
  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 84 84" className="h-24 w-24" role="img" aria-label={`${label}: ${value === null ? "no data" : `${Math.round(pct)}%`}`}>
        <circle cx="42" cy="42" r={r} fill="none" stroke="#e5e5e5" strokeWidth="6" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="#7a7a7a"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform="rotate(-90 42 42)"
        />
        <text x="42" y="47" textAnchor="middle" className="fill-black font-display text-[15px] font-bold">
          {value === null ? "—" : `${Math.round(pct)}%`}
        </text>
      </svg>
      <p className="mt-2 text-sm font-semibold tracking-wide text-black">{label}</p>
      <p className="text-xs tracking-wide text-neutral-600">{status}</p>
    </div>
  );
}

export function TrendArrow({ trend }: { trend: "up" | "down" | "flat" | null }) {
  if (trend === null) return <span className="text-neutral-400" title="Not enough data">—</span>;
  const label = trend === "up" ? "Up on the previous week" : trend === "down" ? "Down on the previous week" : "Same as the previous week";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      <title>{label}</title>
      {trend === "flat" ? <path d="M5 12h14" /> : trend === "up" ? <path d="M12 20V4M6 10l6-6 6 6" /> : <path d="M12 4v16M6 14l6 6 6-6" />}
    </svg>
  );
}

export const pct0 = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);
