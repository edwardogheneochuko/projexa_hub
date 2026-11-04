import Link from "next/link";
import { cn, initials, pct } from "@/lib/utils";
import { BENCHMARK, type KpiStatus } from "@/lib/kpi";

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-sm text-muted">
          {crumbs.map((c) => (
            <span key={c.href} className="flex items-center gap-1">
              <Link href={c.href} className="hover:text-brand hover:underline">
                {c.label}
              </Link>
              <span aria-hidden>›</span>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-brand">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, children, className, actions }: { title?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn("card p-4 sm:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-brand">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Headline number tile. Shows whether a percentage meets the 80% benchmark. */
export function StatTile({
  label,
  value,
  sub,
  benchmark,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  /** Pass a percentage to show a benchmark indicator. */
  benchmark?: number | null;
}) {
  const meets = benchmark !== undefined && benchmark !== null ? benchmark >= BENCHMARK : null;
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
      {meets !== null && (
        <p className={cn("mt-1 text-xs font-medium", meets ? "text-emerald-700" : "text-amber-700")}>
          {meets ? "✓ Meets" : "▲ Below"} {BENCHMARK}% benchmark
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

const TONES = {
  neutral: "bg-stone-100 text-stone-700 border-stone-200",
  good: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  bad: "bg-red-50 text-red-800 border-red-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  brand: "bg-accent-soft text-brand border-orange-200",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}

/** Map any free-text status to a tone (used by HQ tables). */
export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (/(achieved|completed|complete|active|published|won|paid|resolved|accepted|released|held|final|established|launched|reviewed|closed)/.test(s)) return "good";
  if (/(lost|overdue|critical|cancelled|won't|dormant|inactive)/.test(s)) return "bad";
  if (/(progress|pending|open|review|negotiation|proposal|scheduled|drafting|ready|upcoming|onboarding|exploring|discussion)/.test(s)) return "info";
  if (/(paused|deferred|superseded|archived)/.test(s)) return "warn";
  return "neutral";
}

export const ATTENDANCE_TONE: Record<string, Tone> = { PRESENT: "good", LATE: "warn", ABSENT: "bad", EXCUSED: "neutral" };
export const ATTENDANCE_LABEL: Record<string, string> = { PRESENT: "Present", LATE: "Late", ABSENT: "Absent", EXCUSED: "Excused" };

const KPI_STATUS: Record<KpiStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending result", tone: "neutral" },
  ACHIEVED: { label: "Achieved", tone: "good" },
  ON_TRACK: { label: "On track (≥80%)", tone: "info" },
  BELOW: { label: "Below benchmark", tone: "bad" },
};
export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  return <Badge tone={KPI_STATUS[status].tone}>{KPI_STATUS[status].label}</Badge>;
}

export function ReportStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge tone="bad">Not submitted</Badge>;
  return status === "REVIEWED" ? <Badge tone="good">Reviewed</Badge> : <Badge tone="info">Submitted</Badge>;
}

/** Percentage text with a benchmark colour cue (icon + colour, never colour alone). */
export function PctCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const ok = value >= BENCHMARK;
  return (
    <span className={cn("font-medium tabular-nums", ok ? "text-emerald-700" : "text-amber-700")}>
      {pct(value)} <span aria-label={ok ? "meets benchmark" : "below benchmark"}>{ok ? "✓" : "▲"}</span>
    </span>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string; size?: number }) {
  if (url) {
    // External profile-picture link (no uploads).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full border border-line object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-brand"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line bg-cream/50 px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">{children}</table>
    </div>
  );
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A row of GET filters above a table/chart. */
export function FilterBar({ children, resetHref }: { children: React.ReactNode; resetHref?: string }) {
  return (
    <form method="get" className="card mb-4 flex flex-wrap items-end gap-3 p-3">
      {children}
      <div className="flex gap-2">
        <button className="btn-primary" type="submit">
          Apply
        </button>
        {resetHref && (
          <Link href={resetHref} className="btn-secondary">
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
  allLabel = "All",
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel?: string | null;
}) {
  return (
    <div className="min-w-[150px] flex-1 sm:flex-none">
      <label className="label text-xs" htmlFor={`f-${name}`}>
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={value} className="input">
        {allLabel !== null && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ExternalLink({ href, children }: { href: string; children?: React.ReactNode }) {
  let label = children;
  if (!label) {
    try {
      label = new URL(href).hostname.replace(/^www\./, "");
    } catch {
      label = href;
    }
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link break-all">
      {label} ↗
    </a>
  );
}
