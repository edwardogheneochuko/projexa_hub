import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { liveTeamSlugs, visibleSections, visibleSpaces } from "@/lib/hq";
import { Badge, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "HQ" };

export default async function HqHome() {
  const user = await requireUser();
  const spaces = visibleSpaces(user, await liveTeamSlugs());
  const counts = await prisma.hqRecord.groupBy({ by: ["space", "section"], _count: { _all: true } });
  const countFor = (space: string, sections: string[]) =>
    counts.filter((c) => c.space === space && sections.includes(c.section)).reduce((s, c) => s + c._count._all, 0);

  return (
    <>
      <PageHeader
        title="Projexa Hub HQ"
        description="The organisation's workspace for plans, departmental information, records and documentation. Documents are stored as links to Google Docs, Sheets, Drive and other approved resources."
      />
      {spaces.length === 0 ? (
        <EmptyState>You don&apos;t have access to any HQ workspaces yet. Ask the Founder to assign you to a department.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((s) => {
            const sections = visibleSections(user, s);
            const restricted = sections.some((x) => x.confidential);
            return (
              <Link key={s.key} href={`/hq/${s.key}`} className="card block p-5 transition-colors hover:border-brand-soft">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-brand">{s.title}</h2>
                  {restricted && <Badge tone="warn">Restricted</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">{s.description}</p>
                <p className="mt-3 text-xs text-muted">
                  {sections.length} sections · {countFor(s.key, sections.map((x) => x.key))} records
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
