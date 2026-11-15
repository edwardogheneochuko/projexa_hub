import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, canViewPerson } from "@/lib/permissions";
import { formatDate, monthLabel } from "@/lib/periods";
import { Card, PageHeader } from "@/components/ui";
import { performanceStatus } from "@/lib/checklist-score";
import { ConfirmButton } from "@/components/forms";
import { deleteEvaluation } from "../../actions";

export const metadata: Metadata = { title: "Evaluation" };

const SECTIONS = [
  ["attendance", "Attendance"],
  ["kpi", "KPI achievement"],
  ["reporting", "Reporting consistency"],
  ["contributions", "Contributions"],
  ["strengths", "Strengths"],
  ["improvements", "Areas for improvement"],
  ["remarks", "Evaluator's remarks"],
] as const;

export default async function EvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const e = await prisma.evaluation.findUnique({ where: { id }, include: { user: true, team: true, evaluator: true } });
  if (!e || !canViewPerson(user, e.user)) notFound();
  const canEdit = canManageTeam(user, e.teamId) && e.userId !== user.id;

  return (
    <>
      <PageHeader
        title={`${monthLabel(e.month)} evaluation · ${e.user.name}`}
        description={`${e.team.name} · evaluated by ${e.evaluator.name} · last updated ${formatDate(e.updatedAt)}`}
        crumbs={[{ href: "/analytics/evaluations", label: "Monthly evaluations" }]}
        actions={
          canEdit && (
            <>
              <Link href={`/analytics/evaluations/write?user=${e.userId}&month=${e.month}`} className="btn-secondary">Edit</Link>
              <ConfirmButton action={deleteEvaluation.bind(null, e.id)} message="Delete this evaluation permanently?">Delete</ConfirmButton>
            </>
          )
        }
      />
      {e.score !== null && (
        <Card className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Weekly performance score — monthly average</p>
          <p className="mt-1 text-2xl font-bold">
            {Math.round(e.score)}% <span className="text-sm font-normal text-muted">from {e.scoredReports} weekly report{e.scoredReports === 1 ? "" : "s"} · {performanceStatus(e.score, null)}</span>
          </p>
        </Card>
      )}
      <Card>
        <div className="grid gap-5 md:grid-cols-2">
          {SECTIONS.map(([key, label]) => (
            <div key={key} className={key === "remarks" ? "md:col-span-2" : ""}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">{e[key] || <span className="text-muted">—</span>}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
