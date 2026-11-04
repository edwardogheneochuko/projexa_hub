import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isFounder, managedTeamIds } from "@/lib/permissions";
import { reportingStatus } from "@/lib/metrics";
import { currentWeek, isValidWeek, weekLabel, weekOptions } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { Card, EmptyState, FilterBar, FilterSelect, PageHeader, ReportStatusBadge, TableWrap } from "@/components/ui";

export const metadata: Metadata = { title: "Weekly reports" };

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const managed = managedTeamIds(user);
  const isManager = managed === null || managed.length > 0;

  const teamId = sp(params, "team");
  const personId = sp(params, "person");
  const period = isValidWeek(sp(params, "period")) ? sp(params, "period") : "";
  const status = sp(params, "status");

  const where: Prisma.WeeklyReportWhereInput = {};
  if (managed === null) {
    if (teamId) where.teamId = teamId;
    if (personId) where.userId = personId;
  } else if (managed.length) {
    where.teamId = { in: managed };
    if (personId) where.userId = personId;
  } else {
    where.userId = user.id;
  }
  if (period) where.period = period;
  if (status === "SUBMITTED" || status === "REVIEWED") where.status = status;

  const statusWeek = period || currentWeek();
  const statusTeams = managed === null ? (teamId ? [teamId] : undefined) : managed;

  const [reports, teams, people, status_] = await Promise.all([
    prisma.weeklyReport.findMany({ where, include: { user: true, team: true }, orderBy: [{ period: "desc" }, { createdAt: "desc" }], take: 200 }),
    managed === null ? prisma.team.findMany({ orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
    isManager
      ? prisma.user.findMany({ where: { role: { not: "FOUNDER" }, ...(managed === null ? (teamId ? { teamId } : {}) : { teamId: { in: managed } }) }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    isManager ? reportingStatus(statusWeek, statusTeams) : Promise.resolve([]),
  ]);
  const missing = status_.filter((s) => !s.report);

  return (
    <>
      <PageHeader
        title="Weekly performance reports"
        description="Weekly updates on KPI results, contributions and challenges. Statuses are simply Submitted or Reviewed."
        actions={user.teamId && <Link href="/analytics/reports/submit" className="btn-primary">Submit this week&apos;s report</Link>}
      />
      <FilterBar resetHref="/analytics/reports">
        {isFounder(user) && <FilterSelect name="team" label="Department / team" value={teamId} allLabel="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
        {isManager && <FilterSelect name="person" label="Team member" value={personId} allLabel="Everyone" options={people.map((p) => ({ value: p.id, label: p.name }))} />}
        <FilterSelect name="period" label="Reporting week" value={period} allLabel="All weeks" options={weekOptions(26, false)} />
        <FilterSelect name="status" label="Status" value={status} options={[{ value: "SUBMITTED", label: "Submitted" }, { value: "REVIEWED", label: "Reviewed" }]} />
      </FilterBar>

      {isManager && (
        <Card title={`Reporting status · ${weekLabel(statusWeek)}`} className="mb-6">
          <p className="text-sm">
            <strong>{status_.length - missing.length}</strong> of {status_.length} submitted ·{" "}
            <strong>{status_.filter((s) => s.report?.status === "REVIEWED").length}</strong> reviewed
          </p>
          {missing.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              Not yet submitted: {missing.map((m) => `${m.member.name}${isFounder(user) ? ` (${m.member.team?.name})` : ""}`).join(", ")}
            </p>
          )}
        </Card>
      )}

      {reports.length === 0 ? (
        <EmptyState>No reports match these filters.</EmptyState>
      ) : (
        <TableWrap>
          <thead className="border-b border-line bg-cream/60">
            <tr>
              <th className="th">Reporting period</th>
              <th className="th">Team member</th>
              <th className="th">Department / team</th>
              <th className="th">Contributions</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">
                  <Link href={`/analytics/reports/${r.id}`} className="link">{weekLabel(r.period)}</Link>
                </td>
                <td className="td">{r.user.name}</td>
                <td className="td">{r.team.name}</td>
                <td className="td max-w-md text-muted"><span className="line-clamp-2">{r.contributions}</span></td>
                <td className="td"><ReportStatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
