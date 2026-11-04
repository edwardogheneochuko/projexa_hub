import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, managedTeamIds } from "@/lib/permissions";
import { attendanceRate, kpiAverage, METRIC_NOTES } from "@/lib/metrics";
import { currentMonth, isValidMonth, monthLabel, monthOptions, weekRange, weeksOfMonth } from "@/lib/periods";
import { pct, sp, type SearchParams } from "@/lib/utils";
import { Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveEvaluation } from "../../actions";

export const metadata: Metadata = { title: "Write evaluation" };

const FIELDS = [
  { key: "attendance", label: "Attendance" },
  { key: "kpi", label: "KPI achievement" },
  { key: "reporting", label: "Reporting consistency" },
  { key: "contributions", label: "Contributions" },
  { key: "strengths", label: "Strengths" },
  { key: "improvements", label: "Areas for improvement" },
  { key: "remarks", label: "Evaluator's remarks" },
] as const;

export default async function WriteEvaluationPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const managed = managedTeamIds(user);
  if (managed !== null && managed.length === 0) notFound();
  const params = await searchParams;
  const month = isValidMonth(sp(params, "month")) ? sp(params, "month") : currentMonth();

  const people = await prisma.user.findMany({
    where: {
      active: true,
      role: { not: "FOUNDER" },
      id: { not: user.id },
      ...(managed === null ? { teamId: { not: null } } : { teamId: { in: managed } }),
    },
    include: { team: true },
    orderBy: [{ team: { sortOrder: "asc" } }, { name: "asc" }],
  });
  const subject = people.find((p) => p.id === sp(params, "user"));
  const crumbs = [{ href: "/analytics/evaluations", label: "Monthly evaluations" }];

  let facts: { attendance: number | null; sessions: number; reports: number; weeks: number; kpi: number | null } | null = null;
  let existing = null;
  if (subject?.teamId && canManageTeam(user, subject.teamId)) {
    const weeks = weeksOfMonth(month);
    const from = weekRange(weeks[0]).from;
    const to = weekRange(weeks[weeks.length - 1]).to;
    const [att, reports, kpis, ev] = await Promise.all([
      prisma.attendance.findMany({ where: { userId: subject.id, date: { gte: from, lte: to } }, select: { status: true } }),
      prisma.weeklyReport.count({ where: { userId: subject.id, period: { in: weeks } } }),
      prisma.kpi.findMany({ where: { teamId: subject.teamId, period: { in: weeks } }, select: { target: true, actual: true } }),
      prisma.evaluation.findUnique({ where: { userId_month: { userId: subject.id, month } } }),
    ]);
    facts = { attendance: attendanceRate(att), sessions: att.length, reports, weeks: weeks.length, kpi: kpiAverage(kpis) };
    existing = ev;
  }

  return (
    <>
      <PageHeader title={existing ? "Update evaluation" : "Write evaluation"} crumbs={crumbs} />
      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-3 sm:items-end">
        <div>
          <label className="label" htmlFor="user">Team member</label>
          <select id="user" name="user" defaultValue={subject?.id ?? ""} className="input" required>
            <option value="" disabled>Choose…</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.team?.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="month">Month</label>
          <select id="month" name="month" defaultValue={month} className="input">
            {monthOptions(12).map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Continue</button>
      </form>

      {!subject || !facts ? (
        <EmptyState>Choose a team member and month to continue.</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <ActionForm action={saveEvaluation} className="card p-5">
            <input type="hidden" name="userId" value={subject.id} />
            <input type="hidden" name="month" value={month} />
            <p className="text-sm text-muted">
              {subject.name} · {subject.team?.name} · {monthLabel(month)}
            </p>
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={f.key}>
                <textarea id={f.key} name={f.key} rows={f.key === "remarks" ? 4 : 3} defaultValue={existing?.[f.key] ?? ""} className="input" />
              </Field>
            ))}
            <SubmitButton>{existing ? "Save changes" : "Save evaluation"}</SubmitButton>
          </ActionForm>

          <Card title={`Recorded facts · ${monthLabel(month)}`} className="h-fit">
            <dl className="space-y-3 text-sm">
              <div><dt className="text-muted">Attendance rate</dt><dd className="font-semibold">{pct(facts.attendance)} <span className="font-normal text-muted">({facts.sessions} sessions)</span></dd></div>
              <div><dt className="text-muted">Weekly reports submitted</dt><dd className="font-semibold">{facts.reports} of {facts.weeks}</dd></div>
              <div><dt className="text-muted">Team KPI achievement</dt><dd className="font-semibold">{pct(facts.kpi)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              For reference only. The evaluation is written by you — the system does not generate scores or ratings. {METRIC_NOTES.attendance}
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
