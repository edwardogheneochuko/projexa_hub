import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSection, tableColumns, titleField } from "@/lib/hq-config";
import { canEditSection, canViewSection, parseData } from "@/lib/hq";
import { currentMonth, isValidMonth } from "@/lib/periods";
import { cn, naira, sp, type SearchParams } from "@/lib/utils";
import { Badge, EmptyState, FilterBar, FilterSelect, PageHeader } from "@/components/ui";
import { FieldValue, RecordCalendar } from "@/components/hq";

type Params = Promise<{ space: string; section: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const p = await params;
  return { title: getSection(p.space, p.section)?.section.title ?? "HQ" };
}

export default async function SectionPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const user = await requireUser();
  const p = await params;
  const found = getSection(p.space, p.section);
  if (!found || !canViewSection(user, found.space, found.section)) notFound();
  const { space, section } = found;
  const q = await searchParams;

  const view = section.calendarField && sp(q, "view") === "calendar" ? "calendar" : "table";
  const search = sp(q, "q").toLowerCase();
  const status = sp(q, "status");
  const filter = sp(q, "filter");
  const month = isValidMonth(sp(q, "month")) ? sp(q, "month") : currentMonth();
  const statusField = section.fields.find((f) => f.key === section.statusField);
  const filterField = section.fields.find((f) => f.key === section.filterField);
  const tField = titleField(section);
  const base = `/hq/${space.key}/${section.key}`;

  const records = await prisma.hqRecord.findMany({
    where: { space: space.key, section: section.key },
    orderBy: { updatedAt: "desc" },
    include: { updatedBy: { select: { name: true } } },
  });
  const rows = records
    .map((r) => ({ ...r, d: parseData(r.data) }))
    .filter((r) => {
      if (status && r.d[section.statusField!] !== status) return false;
      if (filter && r.d[section.filterField!] !== filter) return false;
      if (search && !Object.values(r.d).join(" ").toLowerCase().includes(search)) return false;
      return true;
    });
  // Date-bearing sections read best newest-date first.
  const dateKey = section.calendarField ?? section.fields.find((f) => f.type === "date")?.key;
  if (dateKey) rows.sort((a, b) => (b.d[dateKey] ?? "").localeCompare(a.d[dateKey] ?? ""));

  const columns = tableColumns(section);
  const sumField = section.fields.find((f) => f.key === section.sumField);
  const total = sumField ? rows.reduce((s, r) => s + (Number(r.d[sumField.key]) || 0), 0) : 0;
  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ ...(search ? { q: sp(q, "q") } : {}), ...(status ? { status } : {}), ...(filter ? { filter } : {}), ...extra });
    return `${base}?${u.toString()}`;
  };

  return (
    <>
      <PageHeader
        title={section.title}
        description={section.description}
        crumbs={[{ href: "/hq", label: "HQ" }, { href: `/hq/${space.key}`, label: space.title }]}
        actions={
          <>
            {section.confidential && <Badge tone="warn">Confidential — restricted access</Badge>}
            {canEditSection(user, space, section) && <Link href={`${base}/new`} className="btn-primary">Add record</Link>}
          </>
        }
      />

      <FilterBar resetHref={base}>
        <div className="min-w-[180px] flex-1">
          <label className="label text-xs" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={sp(q, "q")} placeholder="Search records" className="input" />
        </div>
        {statusField && <FilterSelect name="status" label={statusField.label} value={status} options={statusField.options!.map((o) => ({ value: o, label: o }))} />}
        {filterField && filterField !== statusField && <FilterSelect name="filter" label={filterField.label} value={filter} options={filterField.options!.map((o) => ({ value: o, label: o }))} />}
        {view === "calendar" && <input type="hidden" name="view" value="calendar" />}
      </FilterBar>

      {section.calendarField && (
        <div className="mb-4 inline-flex rounded-lg border border-line bg-white p-0.5 text-sm" role="tablist" aria-label="View">
          <Link href={qs({})} role="tab" aria-selected={view === "table"} className={cn("rounded-md px-3 py-1", view === "table" ? "bg-brand text-white" : "text-ink hover:bg-cream")}>Table</Link>
          <Link href={qs({ view: "calendar", month })} role="tab" aria-selected={view === "calendar"} className={cn("rounded-md px-3 py-1", view === "calendar" ? "bg-brand text-white" : "text-ink hover:bg-cream")}>Calendar</Link>
        </div>
      )}

      {view === "calendar" ? (
        <RecordCalendar
          month={month}
          items={rows.filter((r) => r.d[section.calendarField!]).map((r) => ({ id: r.id, date: r.d[section.calendarField!], title: r.d[tField.key] || "Untitled" }))}
          hrefFor={(id) => `${base}/${id}`}
          navHref={(m) => qs({ view: "calendar", month: m })}
        />
      ) : rows.length === 0 ? (
        <EmptyState>{records.length === 0 ? "No records yet." : "No records match these filters."}</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-line bg-cream/60">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={cn("th", (c.type === "money" || c.type === "number") && "text-right")}>{c.label}</th>
                ))}
                <th className="th">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-cream/40">
                  {columns.map((c) => (
                    <td key={c.key} className={cn("td", (c.type === "money" || c.type === "number") && "text-right", c.type === "longtext" && "max-w-xs")}>
                      {c.key === tField.key ? (
                        <Link href={`${base}/${r.id}`} className="link">{r.d[c.key] || "Untitled"}</Link>
                      ) : (
                        <FieldValue field={c} value={r.d[c.key]} section={section} />
                      )}
                    </td>
                  ))}
                  <td className="td whitespace-nowrap text-xs text-muted">{r.updatedBy.name}</td>
                </tr>
              ))}
            </tbody>
            {sumField && (
              <tfoot className="border-t-2 border-line">
                <tr>
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn("td font-semibold", c.key === sumField.key && "text-right tabular-nums")}>
                      {i === 0 ? `Total (${rows.length} records)` : c.key === sumField.key ? naira(total) : ""}
                    </td>
                  ))}
                  <td className="td" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </>
  );
}
