import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isFounder, managedTeamIds } from "@/lib/permissions";
import { getPerformance, BENCHMARK, METRIC_NOTES } from "@/lib/metrics";
import { formatDate, monthLabel, recentMonths, recentWeeks, weekRange, weekShort } from "@/lib/periods";
import { pct, sp, type SearchParams } from "@/lib/utils";
import { Card, FilterBar, FilterSelect, PageHeader, PctCell, StatTile } from "@/components/ui";
import { ComparisonBars, TrendChart } from "@/components/charts";
import { TeamComparisonTable } from "@/components/dashboards";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Performance reports" };

const RANGES = [
  { value: "4", label: "Last 4 weeks" },
  { value: "8", label: "Last 8 weeks" },
  { value: "13", label: "Last quarter (13 weeks)" },
  { value: "26", label: "Last 26 weeks" },
  { value: "52", label: "Last 52 weeks" },
];

export default async function InsightsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const managed = managedTeamIds(user);
  if (managed !== null && managed.length === 0) notFound();
  const params = await searchParams;
  const weeks = RANGES.some((r) => r.value === sp(params, "weeks")) ? Number(sp(params, "weeks")) : 13;

  const teams = await prisma.team.findMany({ where: managed === null ? {} : { id: { in: managed } }, orderBy: { sortOrder: "asc" } });
  const teamId = teams.find((t) => t.id === sp(params, "team"))?.id ?? (managed === null ? "" : teams[0].id);
  const scopeTeamIds = teamId ? [teamId] : undefined;
  const periods = recentWeeks(weeks);
  const months = recentMonths(6).reverse();

  const [perf, evals, memberCounts] = await Promise.all([
    getPerformance({ teamIds: scopeTeamIds, weeks: periods }),
    prisma.evaluation.groupBy({
      by: ["teamId", "month"],
      where: { month: { in: months }, ...(scopeTeamIds ? { teamId: { in: scopeTeamIds } } : {}) },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["teamId"],
      where: { active: true, role: { not: "FOUNDER" }, teamId: scopeTeamIds ? { in: scopeTeamIds } : { not: null } },
      _count: { _all: true },
    }),
  ]);
  const evalCount = (t: string, m: string) => evals.find((e) => e.teamId === t && e.month === m)?._count._all ?? 0;
  const memberCount = (t: string) => memberCounts.find((m) => m.teamId === t)?._count._all ?? 0;
  const scopeName = teamId ? teams.find((t) => t.id === teamId)!.name : "Organisation-wide";
  const trend = perf.trend.map((t) => ({ ...t, label: weekShort(t.period) }));
  const showComparison = !teamId;

  return (
    <>
      <PageHeader
        title="Performance reports & analysis"
        description={`${scopeName} · ${formatDate(weekRange(periods[0]).from)} – ${formatDate(weekRange(periods[periods.length - 1]).to)}`}
        actions={<PrintButton />}
      />
      <div className="print:hidden">
        <FilterBar resetHref="/analytics/insights">
          {isFounder(user) && <FilterSelect name="team" label="Department / team" value={teamId} allLabel="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
          <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGES} />
        </FilterBar>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Members" value={perf.memberCount} />
          <StatTile label="Attendance" value={pct(perf.attendance.rate)} benchmark={perf.attendance.rate} />
          <StatTile label="KPI achievement" value={pct(perf.kpi.average)} benchmark={perf.kpi.average} />
          <StatTile label="Reporting consistency" value={pct(perf.reporting.rate)} benchmark={perf.reporting.rate} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Attendance trend"><TrendChart data={trend} series={["attendance"]} /></Card>
          <Card title="Weekly KPI achievement"><TrendChart data={trend} series={["kpi"]} /></Card>
          <Card title="Reporting consistency"><TrendChart data={trend} series={["reporting"]} /></Card>
        </div>

        {showComparison && (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Attendance by team"><ComparisonBars metric="Attendance" data={perf.byTeam.map((t) => ({ name: t.team.name, value: t.attendance }))} /></Card>
              <Card title="KPI achievement by team"><ComparisonBars metric="KPI achievement" data={perf.byTeam.map((t) => ({ name: t.team.name, value: t.kpi }))} /></Card>
              <Card title="Reporting by team"><ComparisonBars metric="Reporting" data={perf.byTeam.map((t) => ({ name: t.team.name, value: t.reporting }))} /></Card>
            </div>
            <Card title="Departmental performance comparison">
              <TeamComparisonTable perf={perf} />
            </Card>
          </>
        )}

        <Card title="Individual performance">
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line">
                <tr>
                  <th className="th pl-5">Member</th>
                  {showComparison && <th className="th">Team</th>}
                  <th className="th text-right">Attendance</th>
                  <th className="th text-right">Absences</th>
                  <th className="th text-right">Reports</th>
                  <th className="th text-right">Reporting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {perf.byMember.map((m) => (
                  <tr key={m.member.id}>
                    <td className="td pl-5"><Link href={`/analytics/people/${m.member.id}`} className="link">{m.member.name}</Link></td>
                    {showComparison && <td className="td text-muted">{perf.byTeam.find((t) => t.team.id === m.member.teamId)?.team.name}</td>}
                    <td className="td text-right"><PctCell value={m.attendance} /></td>
                    <td className="td text-right tabular-nums">{m.absences}</td>
                    <td className="td text-right tabular-nums">{m.reportsSubmitted} / {periods.length}</td>
                    <td className="td text-right"><PctCell value={m.reporting} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Monthly evaluation summary (evaluations recorded / members)">
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line">
                <tr>
                  <th className="th pl-5">Team</th>
                  {months.map((m) => (
                    <th key={m} className="th text-right">{monthLabel(m).replace(/ \d{4}$/, "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {perf.byTeam.map((t) => (
                  <tr key={t.team.id}>
                    <td className="td pl-5">{t.team.name}</td>
                    {months.map((m) => (
                      <td key={m} className="td text-right tabular-nums">
                        {evalCount(t.team.id, m)} / {memberCount(t.team.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-xs text-muted">
          <p>The {BENCHMARK}% benchmark is shown on every chart. No combined or weighted score is calculated.</p>
          <ul className="mt-1 list-disc pl-5">
            <li>{METRIC_NOTES.attendance}</li>
            <li>{METRIC_NOTES.kpi}</li>
            <li>{METRIC_NOTES.reporting}</li>
          </ul>
        </div>
      </div>
    </>
  );
}
