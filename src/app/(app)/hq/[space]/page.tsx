import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSpace, SPACES } from "@/lib/hq-config";
import { parseData, visibleSections } from "@/lib/hq";
import { formatDate } from "@/lib/periods";
import { naira } from "@/lib/utils";
import { Badge, Card, PageHeader, StatTile } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ space: string }> }) {
  return { title: getSpace((await params).space)?.title ?? "HQ" };
}

async function FinanceSummary() {
  const rows = await prisma.hqRecord.findMany({ where: { space: "finance", section: { in: ["income", "expenses"] } }, select: { section: true, data: true } });
  const year = String(new Date().getFullYear());
  let income = 0;
  let expenses = 0;
  for (const r of rows) {
    const d = parseData(r.data);
    if (!d.date?.startsWith(year)) continue;
    const amt = Number(d.amount) || 0;
    if (r.section === "income") income += amt;
    else expenses += amt;
  }
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      <StatTile label={`Income ${year}`} value={naira(income)} />
      <StatTile label={`Expenses ${year}`} value={naira(expenses)} />
      <StatTile label={`Net ${year}`} value={naira(income - expenses)} />
    </div>
  );
}

export default async function SpacePage({ params }: { params: Promise<{ space: string }> }) {
  const user = await requireUser();
  const space = getSpace((await params).space);
  if (!space) notFound();
  const sections = visibleSections(user, space);
  if (sections.length === 0) notFound();

  const stats = await prisma.hqRecord.groupBy({
    by: ["section"],
    where: { space: space.key, section: { in: sections.map((s) => s.key) } },
    _count: { _all: true },
    _max: { updatedAt: true },
  });

  return (
    <>
      <PageHeader title={space.title} description={space.description} crumbs={[{ href: "/hq", label: "HQ" }]} />
      {space.key === "finance" && sections.some((s) => s.key === "income") && <FinanceSummary />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const st = stats.find((x) => x.section === s.key);
          return (
            <Link key={s.key} href={`/hq/${space.key}/${s.key}`} className="card block p-5 transition-colors hover:border-brand-soft">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-brand">{s.title}</h2>
                {s.confidential && <Badge tone="warn">Confidential</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">{s.description}</p>
              <p className="mt-3 text-xs text-muted">
                {st?._count._all ?? 0} records
                {st?._max.updatedAt && ` · updated ${formatDate(st._max.updatedAt)}`}
                {s.calendarField && " · calendar"}
              </p>
            </Link>
          );
        })}
      </div>

      {space.teamSlug === null && (
        <Card title="Departmental spaces" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {SPACES.filter((s) => s.teamSlug !== null).map((s) => (
              <li key={s.key}>
                <Link href={`/hq/${s.key}`} className="btn-secondary">{s.title}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
