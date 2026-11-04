import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, isFounder } from "@/lib/permissions";
import { kpiAchievement, kpiStatus, BENCHMARK } from "@/lib/kpi";
import { kpiAverage, METRIC_NOTES } from "@/lib/metrics";
import { currentWeek, isValidWeek, isoWeek, weekStart, addDays, weekLabel, weekOptions } from "@/lib/periods";
import { pct, sp, type SearchParams } from "@/lib/utils";
import { EmptyState, FilterBar, FilterSelect, KpiStatusBadge, PageHeader, StatTile, TableWrap } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { copyKpis } from "../actions";

export const metadata: Metadata = { title: "KPI matrix" };

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending result" },
  { value: "ACHIEVED", label: "Achieved" },
  { value: "ON_TRACK", label: "On track (≥80%)" },
  { value: "BELOW", label: "Below benchmark" },
];

export default async function KpisPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const teams = await prisma.team.findMany({
    where: isFounder(user) ? {} : { id: user.teamId ?? "__none__" },
    orderBy: { sortOrder: "asc" },
  });
  const teamId = teams.find((t) => t.id === sp(params, "team"))?.id ?? teams[0]?.id ?? "";
  const period = isValidWeek(sp(params, "period")) ? sp(params, "period") : currentWeek();
  const status = sp(params, "status");
  const q = sp(params, "q").toLowerCase();
  const canManage = teamId ? canManageTeam(user, teamId) : false;
  const prevWeek = isoWeek(addDays(weekStart(period), -7));

  const all = teamId
    ? await prisma.kpi.findMany({ where: { teamId, period }, include: { updatedBy: true }, orderBy: { name: "asc" } })
    : [];
  const rows = all.filter((k) => (!status || kpiStatus(k) === status) && (!q || `${k.name} ${k.description}`.toLowerCase().includes(q)));
  const avg = kpiAverage(all);

  return (
    <>
      <PageHeader
        title="Weekly KPI matrix"
        description={`Agreed performance indicators per department, measured weekly against the ${BENCHMARK}% benchmark. KPIs measure performance — they are not task assignments.`}
        actions={canManage && <Link href={`/analytics/kpis/new?team=${teamId}&period=${period}`} className="btn-primary">Add KPI</Link>}
      />
      {teams.length === 0 ? (
        <EmptyState>You are not assigned to a team yet.</EmptyState>
      ) : (
        <>
          <FilterBar resetHref="/analytics/kpis">
            {teams.length > 1 && <FilterSelect name="team" label="Department / team" value={teamId} allLabel={null} options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
            <FilterSelect name="period" label="Reporting week" value={period} allLabel={null} options={weekOptions(26)} />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} />
            <div className="min-w-[160px] flex-1">
              <label className="label text-xs" htmlFor="q">Search</label>
              <input id="q" name="q" defaultValue={sp(params, "q")} placeholder="KPI name" className="input" />
            </div>
          </FilterBar>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="KPIs this week" value={all.length} />
            <StatTile label="Average achievement" value={pct(avg)} benchmark={avg} />
            <StatTile label="Below benchmark" value={all.filter((k) => kpiStatus(k) === "BELOW").length} />
            <StatTile label="Awaiting results" value={all.filter((k) => k.actual === null).length} />
          </div>

          {rows.length === 0 ? (
            <EmptyState>
              No KPIs for {weekLabel(period)}
              {(status || q) && " match these filters"}.
            </EmptyState>
          ) : (
            <TableWrap>
              <thead className="border-b border-line bg-cream/60">
                <tr>
                  <th className="th">KPI name</th>
                  <th className="th">Description</th>
                  <th className="th text-right">Target</th>
                  <th className="th">Period</th>
                  <th className="th text-right">Actual result</th>
                  <th className="th text-right">Achievement %</th>
                  <th className="th">Status</th>
                  <th className="th">Remarks</th>
                  <th className="th">Updated by</th>
                  {canManage && <th className="th"><span className="sr-only">Edit</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((k) => (
                  <tr key={k.id}>
                    <td className="td font-medium">{k.name}</td>
                    <td className="td max-w-xs text-muted">{k.description}</td>
                    <td className="td text-right tabular-nums">{k.target} {k.unit}</td>
                    <td className="td whitespace-nowrap">{k.period}</td>
                    <td className="td text-right tabular-nums">{k.actual === null ? "—" : `${k.actual} ${k.unit}`}</td>
                    <td className="td text-right tabular-nums">{pct(kpiAchievement(k))}</td>
                    <td className="td"><KpiStatusBadge status={kpiStatus(k)} /></td>
                    <td className="td max-w-xs text-muted">{k.remarks}</td>
                    <td className="td whitespace-nowrap text-muted">{k.updatedBy.name}</td>
                    {canManage && (
                      <td className="td">
                        <Link href={`/analytics/kpis/${k.id}`} className="link text-sm">Update</Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}

          {canManage && (
            <details className="card mt-6 p-4">
              <summary className="cursor-pointer text-sm font-medium text-brand">Start this week from last week&apos;s KPIs</summary>
              <ActionForm action={copyKpis} className="mt-3">
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="from" value={prevWeek} />
                <input type="hidden" name="to" value={period} />
                <p className="text-sm text-muted">
                  Copies KPI names, descriptions and targets from {weekLabel(prevWeek)} into {weekLabel(period)}. Results are left blank. KPIs that already exist this week are skipped.
                </p>
                <SubmitButton className="btn-secondary">Copy KPIs</SubmitButton>
              </ActionForm>
            </details>
          )}
          <p className="mt-4 text-xs text-muted">{METRIC_NOTES.kpi}</p>
        </>
      )}
    </>
  );
}
