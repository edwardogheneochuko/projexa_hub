import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { MAX_ITEMS } from "@/lib/checklist-score";
import { INVITE_ROLES } from "@/lib/invites";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ChecklistForm } from "./checklist-form";

export const metadata: Metadata = { title: "Performance checklists" };

export default async function ChecklistsPage() {
  await requireFounder();
  const [teams, checklists] = await Promise.all([
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.checklist.findMany({
      include: { team: true, _count: { select: { items: true, reports: true } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Performance checklists"
        description="The weekly checklist each person completes with their report (PRD §4.2). Write each expectation and how it's scored; the score is calculated automatically. A person gets the most specific active checklist for their department and role."
        crumbs={[{ href: "/settings", label: "Settings" }]}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
        <Card title="New checklist">
          <ChecklistForm teams={teams} />
        </Card>
        <div className="space-y-3">
          {checklists.length === 0 && <EmptyState>No checklists yet. Create one, then add up to {MAX_ITEMS} items.</EmptyState>}
          {checklists.map((c) => (
            <Link key={c.id} href={`/settings/checklists/${c.id}`} className="card block p-4 transition-colors hover:border-brand-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-brand">{c.name}</p>
                <span className="flex gap-1">
                  {!c.active && <Badge>Inactive</Badge>}
                  {c._count.items === 0 && <Badge tone="warn">No items yet</Badge>}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {c.team?.name ?? "Every department"} · {c.role ? INVITE_ROLES[c.role] ?? c.role : "every role"} · {c._count.items} of {MAX_ITEMS} items · benchmark {c.benchmark}% · used in {c._count.reports} reports
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
