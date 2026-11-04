import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { kpiAchievement } from "@/lib/kpi";
import { currentWeek, isValidWeek, weekLabel, weekOptions } from "@/lib/periods";
import { pct, sp, type SearchParams } from "@/lib/utils";
import { Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { submitReport } from "../../actions";

export const metadata: Metadata = { title: "Submit weekly report" };

export default async function SubmitReportPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const crumbs = [{ href: "/analytics/reports", label: "Weekly reports" }];
  if (!user.teamId || !user.team) {
    return (
      <>
        <PageHeader title="Submit weekly report" crumbs={crumbs} />
        <EmptyState>You need to be assigned to a team before you can submit reports.</EmptyState>
      </>
    );
  }
  const period = isValidWeek(sp(params, "period")) && sp(params, "period") <= currentWeek() ? sp(params, "period") : currentWeek();
  const [existing, kpis] = await Promise.all([
    prisma.weeklyReport.findUnique({ where: { userId_period: { userId: user.id, period } } }),
    prisma.kpi.findMany({ where: { teamId: user.teamId, period }, orderBy: { name: "asc" } }),
  ]);

  if (existing?.status === "REVIEWED") {
    return (
      <>
        <PageHeader title="Submit weekly report" crumbs={crumbs} />
        <EmptyState>
          Your report for {weekLabel(period)} has been reviewed and can no longer be edited.{" "}
          <Link className="link" href={`/analytics/reports/${existing.id}`}>View report</Link>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={existing ? "Update weekly report" : "Submit weekly report"}
        crumbs={crumbs}
        description={`${user.name} · ${user.team.name}. You can update your report until it has been reviewed.`}
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="label" htmlFor="period">Reporting period</label>
          <select id="period" name="period" defaultValue={period} className="input">
            {weekOptions(8, false).map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>
        <button className="btn-secondary" type="submit">Change week</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ActionForm action={submitReport} className="card p-5">
          <input type="hidden" name="period" value={period} />
          <Field label="KPI results" htmlFor="kpiResults" hint="Your results against the team's KPIs this week.">
            <textarea id="kpiResults" name="kpiResults" rows={4} defaultValue={existing?.kpiResults} className="input" />
          </Field>
          <Field label="Contributions during the period *" htmlFor="contributions">
            <textarea id="contributions" name="contributions" rows={5} required defaultValue={existing?.contributions} className="input" />
          </Field>
          <Field label="Challenges encountered" htmlFor="challenges">
            <textarea id="challenges" name="challenges" rows={3} defaultValue={existing?.challenges} className="input" />
          </Field>
          <Field label="Remarks" htmlFor="remarks">
            <textarea id="remarks" name="remarks" rows={2} defaultValue={existing?.remarks} className="input" />
          </Field>
          <Field label="Supporting links" htmlFor="links" hint="One link per line — Google Docs, Sheets, Drive or other approved resources. Files are not uploaded.">
            <textarea id="links" name="links" rows={3} defaultValue={existing?.links} placeholder="https://docs.google.com/..." className="input font-mono text-xs" />
          </Field>
          <SubmitButton>{existing ? "Update report" : "Submit report"}</SubmitButton>
        </ActionForm>

        <Card title={`Team KPIs · ${weekLabel(period)}`} className="h-fit">
          {kpis.length === 0 ? (
            <p className="text-sm text-muted">No KPIs recorded for your team this week.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {kpis.map((k) => (
                <li key={k.id}>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted">
                    Target {k.target} {k.unit} · Actual {k.actual ?? "—"} · {pct(kpiAchievement(k))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
