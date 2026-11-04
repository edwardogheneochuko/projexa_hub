import Link from "next/link";
import type { Field as FieldDef, Section } from "@/lib/hq-config";
import type { RecordData } from "@/lib/hq";
import { addDays, formatDate, parseDate, toDateStr, today } from "@/lib/periods";
import { naira } from "@/lib/utils";
import { Badge, ExternalLink, Field, statusTone } from "./ui";

/** Render one field value for display. */
export function FieldValue({ field, value, section }: { field: FieldDef; value?: string; section?: Section }) {
  if (!value) return <span className="text-muted">—</span>;
  switch (field.type) {
    case "date":
      return <span className="whitespace-nowrap">{formatDate(value)}</span>;
    case "money":
      return <span className="tabular-nums">{naira(Number(value))}</span>;
    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString()}</span>;
    case "link":
      return <ExternalLink href={value} />;
    case "email":
      return <a href={`mailto:${value}`} className="link">{value}</a>;
    case "phone":
      return <a href={`tel:${value}`} className="link">{value}</a>;
    case "select":
      return section?.statusField === field.key ? <Badge tone={statusTone(value)}>{value}</Badge> : <span>{value}</span>;
    case "longtext":
      return <span className="whitespace-pre-wrap">{value}</span>;
    default:
      return <span>{value}</span>;
  }
}

/** Form inputs for a section's fields. */
export function RecordFields({ section, data }: { section: Section; data?: RecordData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {section.fields.map((f) => {
        const id = `f_${f.key}`;
        const value = data?.[f.key] ?? "";
        const label = f.required ? `${f.label} *` : f.label;
        const wide = f.type === "longtext" || f.type === "link";
        let input: React.ReactNode;
        switch (f.type) {
          case "longtext":
            input = <textarea id={id} name={id} defaultValue={value} rows={4} required={f.required} className="input" />;
            break;
          case "select":
            input = (
              <select id={id} name={id} defaultValue={value} required={f.required} className="input">
                <option value="">{f.required ? "Choose…" : "—"}</option>
                {f.options!.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            );
            break;
          case "date":
            input = <input id={id} name={id} type="date" defaultValue={value} required={f.required} className="input" />;
            break;
          case "number":
          case "money":
            input = <input id={id} name={id} type="number" step="any" defaultValue={value} required={f.required} className="input" />;
            break;
          case "link":
            input = <input id={id} name={id} type="url" defaultValue={value} placeholder="https://" required={f.required} className="input" />;
            break;
          case "email":
            input = <input id={id} name={id} type="email" defaultValue={value} required={f.required} className="input" />;
            break;
          case "phone":
            input = <input id={id} name={id} type="tel" defaultValue={value} required={f.required} className="input" />;
            break;
          default:
            input = <input id={id} name={id} defaultValue={value} required={f.required} maxLength={500} className="input" />;
        }
        return (
          <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
            <Field label={label} htmlFor={id} hint={f.hint}>
              {input}
            </Field>
          </div>
        );
      })}
    </div>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month calendar of records placed on their calendar date. */
export function RecordCalendar({
  month,
  items,
  hrefFor,
  navHref,
}: {
  month: string; // YYYY-MM
  items: { id: string; date: string; title: string; status?: string }[];
  hrefFor: (id: string) => string;
  navHref: (month: string) => string;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = addDays(first, -((first.getUTCDay() || 7) - 1));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const lastRowNeeded = cells.slice(35).some((d) => d.getUTCMonth() === m - 1);
  const shown = lastRowNeeded ? cells : cells.slice(0, 35);
  const prev = toDateStr(new Date(Date.UTC(y, m - 2, 1))).slice(0, 7);
  const next = toDateStr(new Date(Date.UTC(y, m, 1))).slice(0, 7);
  const todayStr = toDateStr(today());
  const byDate = new Map<string, typeof items>();
  for (const it of items) byDate.set(it.date, [...(byDate.get(it.date) ?? []), it]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Link href={navHref(prev)} className="btn-secondary px-2.5 py-1" aria-label="Previous month">‹</Link>
        <h3 className="font-semibold text-brand">
          {first.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
        </h3>
        <Link href={navHref(next)} className="btn-secondary px-2.5 py-1" aria-label="Next month">›</Link>
      </div>
      {/* Grid on wider screens */}
      <div className="hidden grid-cols-7 md:grid">
        {WEEKDAYS.map((d) => (
          <div key={d} className="border-b border-line bg-cream/60 px-2 py-1.5 text-xs font-semibold text-muted">{d}</div>
        ))}
        {shown.map((d) => {
          const ds = toDateStr(d);
          const inMonth = d.getUTCMonth() === m - 1;
          return (
            <div key={ds} className={`min-h-24 border-b border-r border-line p-1.5 ${inMonth ? "" : "bg-cream/40 text-muted"}`}>
              <p className={`mb-1 text-xs ${ds === todayStr ? "inline-block rounded-full bg-brand px-1.5 font-semibold text-white" : ""}`}>{d.getUTCDate()}</p>
              <ul className="space-y-1">
                {(byDate.get(ds) ?? []).map((it) => (
                  <li key={it.id}>
                    <Link href={hrefFor(it.id)} className="block truncate rounded bg-accent-soft px-1.5 py-0.5 text-xs text-brand hover:bg-orange-100" title={it.title}>
                      {it.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      {/* Agenda list on phones */}
      <ul className="divide-y divide-line md:hidden">
        {items.filter((i) => i.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)).map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
            <Link href={hrefFor(it.id)} className="link">{it.title}</Link>
            <span className="whitespace-nowrap text-xs text-muted">{formatDate(parseDate(it.date))}</span>
          </li>
        ))}
        {items.filter((i) => i.date.startsWith(month)).length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">Nothing scheduled this month.</li>}
      </ul>
    </div>
  );
}
