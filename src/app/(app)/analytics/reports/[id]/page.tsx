import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, canViewPerson } from "@/lib/permissions";
import { formatDate, weekLabel } from "@/lib/periods";
import { splitLinks } from "@/lib/utils";
import { Card, ExternalLink, PageHeader, ReportStatusBadge } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { METHODS, performanceStatus } from "@/lib/checklist-score";
import { reviewReport } from "../../actions";

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
  const r = await prisma.weeklyReport.findUnique({ where: { id }, include: { user: true, team: true, reviewedBy: true, answers: { orderBy: { sortOrder: "asc" } } } });
  if (!r || !canViewPerson(user, r.user)) notFound();
  const canReview = r.status === "SUBMITTED" && canManageTeam(user, r.teamId) && r.userId !== user.id;
  const canEdit = r.status === "SUBMITTED" && r.userId === user.id;
  const links = splitLinks(r.links);
  const status = performanceStatus(r.score, r.benchmark);
  const answerText = (a: { method: string; value: number; target: number | null; unit: string }) =>
    a.method === "YESNO" ? (a.value === 1 ? "Done" : "Not done") : a.method === "TARGET" ? `${a.value} of ${a.target} ${a.unit}`.trim() : `${a.value} / 5`;

  return (
    <>
      <PageHeader
        title={`Weekly report · ${r.user.name}`}
        description={`${weekLabel(r.period)} · ${r.team.name}`}
        crumbs={[{ href: "/analytics/reports", label: "Weekly reports" }]}
        actions={
          <>
            {canEdit && <Link href={`/analytics/reports/submit?period=${r.period}`} className="btn-secondary">Edit</Link>}
          </>
        }
      />
      {r.score !== null && (
        <Card className="mb-6" title="Weekly checklist">
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-3xl font-bold">{Math.round(r.score)}%</p>
            <p className="text-sm text-muted">Benchmark {r.benchmark ?? 80}%</p>
            {status && (
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${status === "On Track" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{status}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Expectation</th>
                  <th className="py-2 pr-3">Answer</th>
                  <th className="py-2 pr-3">Scoring</th>
                  <th className="py-2 pr-3 text-right">Weight</th>
                  <th className="py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.answers.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3">
                      {a.title}
                      {a.note && <p className="text-xs text-muted">{a.note}</p>}
                    </td>
                    <td className="py-2 pr-3">{answerText(a)}</td>
                    <td className="py-2 pr-3 text-xs text-muted">{METHODS[a.method as keyof typeof METHODS]?.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{a.weight}</td>
                    <td className="py-2 text-right tabular-nums">{Math.round(a.score)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {r.status === "REVIEWED" && (
        <Card className="mb-6" title="Feedback">
          <p className="whitespace-pre-wrap text-sm">{r.feedback || <span className="text-muted">Reviewed without written feedback.</span>}</p>
          {r.reviewedBy && <p className="mt-2 text-xs text-muted">— {r.reviewedBy.name}{r.reviewedAt ? `, ${formatDate(r.reviewedAt)}` : ""}</p>}
        </Card>
      )}
      {canReview && (
        <Card className="mb-6" title="Review this report">
          <ActionForm action={reviewReport.bind(null, r.id)}>
            <label className="label" htmlFor="feedback">Feedback for {r.user.name.split(" ")[0]}</label>
            <textarea id="feedback" name="feedback" rows={3} maxLength={2000} placeholder="What went well, what to improve…" className="input" />
            <p className="text-xs text-muted">Once reviewed, the report can no longer be edited, and the author sees your feedback{r.score !== null ? ", score and status" : ""}.</p>
            <SubmitButton>Mark as reviewed</SubmitButton>
          </ActionForm>
        </Card>
      )}
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
