import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, canViewPerson } from "@/lib/permissions";
import { formatDate, weekLabel } from "@/lib/periods";
import { splitLinks } from "@/lib/utils";
import { Card, ExternalLink, PageHeader, ReportStatusBadge } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { markReviewed } from "../../actions";

export const metadata: Metadata = { title: "Weekly report" };

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value || <span className="text-muted">—</span>}</p>
    </div>
  );
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await prisma.weeklyReport.findUnique({ where: { id }, include: { user: true, team: true, reviewedBy: true } });
  if (!r || !canViewPerson(user, r.user)) notFound();
  const canReview = r.status === "SUBMITTED" && canManageTeam(user, r.teamId) && r.userId !== user.id;
  const canEdit = r.status === "SUBMITTED" && r.userId === user.id;
  const links = splitLinks(r.links);

  return (
    <>
      <PageHeader
        title={`Weekly report · ${r.user.name}`}
        description={`${weekLabel(r.period)} · ${r.team.name}`}
        crumbs={[{ href: "/analytics/reports", label: "Weekly reports" }]}
        actions={
          <>
            {canEdit && <Link href={`/analytics/reports/submit?period=${r.period}`} className="btn-secondary">Edit</Link>}
            {canReview && (
              <ConfirmButton action={markReviewed.bind(null, r.id)} message="Mark this report as reviewed? The author will no longer be able to edit it." className="btn-primary">
                Mark as reviewed
              </ConfirmButton>
            )}
          </>
        }
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <ReportStatusBadge status={r.status} />
          Submitted {formatDate(r.createdAt)}
          {r.updatedAt.getTime() - r.createdAt.getTime() > 60_000 && <> · updated {formatDate(r.updatedAt)}</>}
          {r.reviewedBy && r.reviewedAt && <> · reviewed by {r.reviewedBy.name} on {formatDate(r.reviewedAt)}</>}
        </div>
        <div className="space-y-5">
          <Block label="KPI results" value={r.kpiResults} />
          <Block label="Contributions during the period" value={r.contributions} />
          <Block label="Challenges encountered" value={r.challenges} />
          <Block label="Remarks" value={r.remarks} />
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Supporting links</h3>
            {links.length === 0 ? (
              <p className="mt-1 text-sm text-muted">—</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {links.map((l) => (
                  <li key={l}><ExternalLink href={l} /></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
