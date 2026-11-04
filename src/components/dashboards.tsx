import Link from "next/link";
import type { Team, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPerformance, reportingStatus, METRIC_NOTES, BENCHMARK, type Performance } from "@/lib/metrics";
import { kpiAchievement, kpiStatus } from "@/lib/kpi";
import { currentMonth, currentWeek, formatDate, monthLabel, recentWeeks, weekLabel, weekShort } from "@/lib/periods";
import { pct } from "@/lib/utils";
import { getSpace, SPACES } from "@/lib/hq-config";
import { parseData } from "@/lib/hq";
import { ComparisonBars, TrendChart } from "./charts";
import {
  ATTENDANCE_LABEL,
  ATTENDANCE_TONE,
  Badge,
  Card,
  EmptyState,
  KpiStatusBadge,
  PctCell,
  ReportStatusBadge,
  StatTile,
} from "./ui";

export const RANGE_OPTIONS = [
  { value: "4", label: "Last 4 weeks" },
  { value: "8", label: "Last 8 weeks" },
  { value: "12", label: "Last 12 weeks" },
  { value: "26", label: "Last 26 weeks" },
];

export function parseRange(v: string): number {
  return [4, 8, 12, 26].includes(Number(v)) ? Number(v) : 8;
}

function MetricNotes() {
  return (
    <details className="mt-6 text-xs text-muted">
      <summary className="cursor-pointer font-medium hover:text-brand">How these figures are calculated</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>{METRIC_NOTES.attendance}</li>
        <li>{METRIC_NOTES.kpi}</li>
        <li>{METRIC_NOTES.reporting}</li>
        <li>The {BENCHMARK}% benchmark is shown for reference. No combined or weighted performance score is calculated.</li>
      </ul>
    </details>
  );
}

function trendData(perf: Performance) {
  return perf.trend.map((t) => ({ ...t, label: weekShort(t.period) }));
}

function HeadlineTiles({ perf, members = true }: { perf: Performance; members?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {members && <StatTile label="Team members" value={perf.memberCount} sub="Active, excluding the Founder" />}
      <StatTile
        label="Attendance"
        value={pct(perf.attendance.rate)}
        benchmark={perf.attendance.rate}
        sub={`${perf.attendance.total} records · ${perf.attendance.counts.ABSENT ?? 0} absent`}
      />
      <StatTile
        label="KPI achievement"
        value={pct(perf.kpi.average)}
        benchmark={perf.kpi.average}
        sub={`${perf.kpi.count} KPIs · ${perf.kpi.pending} awaiting results`}
      />
      <StatTile
        label="Reporting"
        value={pct(perf.reporting.rate)}
        benchmark={perf.reporting.rate}
        sub={`${perf.reporting.submitted} of ${perf.reporting.expected} weekly reports`}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Organisation

export async function OrgDashboard({ weeks }: { weeks: number }) {
  const periods = recentWeeks(weeks);
  const month = currentMonth();
  const [perf, status, evalCount, recentEvals] = await Promise.all([
    getPerformance({ weeks: periods }),
    reportingStatus(currentWeek()),
    prisma.evaluation.count({ where: { month } }),
    prisma.evaluation.findMany({
      orderBy: [{ month: "desc" }, { updatedAt: "desc" }],
      take: 6,
      include: { user: true, team: true },
    }),
  ]);

  const statusByTeam = new Map<string, { name: string; slug: string; submitted: number; reviewed: number; total: number }>();
  for (const s of status) {
    const t = s.member.team!;
    const e = statusByTeam.get(t.id) ?? { name: t.name, slug: t.slug, submitted: 0, reviewed: 0, total: 0 };
    e.total++;
    if (s.report) e.submitted++;
    if (s.report?.status === "REVIEWED") e.reviewed++;
    statusByTeam.set(t.id, e);
  }
  const orgOk = perf.kpi.average !== null && perf.kpi.average >= BENCHMARK;
  const spotlight = perf.byTeam.filter((t) => t.team.slug === "alumni" || t.team.slug === "campus-chapter");

  return (
    <div className="space-y-6">
      <HeadlineTiles perf={perf} />

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${orgOk ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
      >
        <strong>Organisational performance vs {BENCHMARK}% benchmark:</strong>{" "}
        {perf.kpi.average === null
          ? "no KPI results recorded in this period yet."
          : `average KPI achievement is ${pct(perf.kpi.average)} — ${orgOk ? "meeting" : "below"} the benchmark. ${
              perf.byTeam.filter((t) => t.kpi !== null && t.kpi < BENCHMARK).length
            } of ${perf.byTeam.length} teams are below ${BENCHMARK}%.`}{" "}
        Evaluations recorded for {monthLabel(month)}: {evalCount} of {perf.memberCount}.
      </div>

      <Card title="Organisation-wide trends">
        <TrendChart data={trendData(perf)} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Attendance by team">
          <ComparisonBars metric="Attendance" data={perf.byTeam.map((t) => ({ name: t.team.name, value: t.attendance }))} />
        </Card>
        <Card title="KPI achievement by team">
          <ComparisonBars metric="KPI achievement" data={perf.byTeam.map((t) => ({ name: t.team.name, value: t.kpi }))} />
        </Card>
      </div>

      <Card title="Department & team comparison">
        <TeamComparisonTable perf={perf} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={`Reporting status · ${weekLabel(currentWeek())}`}
          actions={<Link href="/analytics/reports" className="link text-sm">All reports</Link>}
        >
          <ul className="divide-y divide-line">
            {[...statusByTeam.values()].map((t) => (
              <li key={t.slug} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={`/analytics/teams/${t.slug}`} className="link">{t.name}</Link>
                <span className="flex items-center gap-2 tabular-nums text-muted">
                  {t.submitted}/{t.total} submitted · {t.reviewed} reviewed
                  {t.submitted < t.total ? <Badge tone="warn">{t.total - t.submitted} missing</Badge> : <Badge tone="good">Complete</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent monthly evaluations" actions={<Link href="/analytics/evaluations" className="link text-sm">All evaluations</Link>}>
          {recentEvals.length === 0 ? (
            <EmptyState>No evaluations recorded yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {recentEvals.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <Link href={`/analytics/evaluations/${e.id}`} className="link">{e.user.name}</Link>{" "}
                  <span className="text-muted">· {e.team.name} · {monthLabel(e.month)}</span>
                  {e.strengths && <p className="mt-0.5 line-clamp-1 text-muted">Strengths: {e.strengths}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {spotlight.map((t) => (
          <Card key={t.team.id} title={`${t.team.name} team`} actions={<Link href={`/analytics/teams/${t.team.slug}`} className="link text-sm">Open dashboard</Link>}>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-xs text-muted">Attendance</dt><dd><PctCell value={t.attendance} /></dd></div>
              <div><dt className="text-xs text-muted">KPI</dt><dd><PctCell value={t.kpi} /></dd></div>
              <div><dt className="text-xs text-muted">Reporting</dt><dd><PctCell value={t.reporting} /></dd></div>
            </dl>
          </Card>
        ))}
      </div>
      <MetricNotes />
    </div>
  );
}

export function TeamComparisonTable({ perf }: { perf: Performance }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[640px]">
        <thead className="border-b border-line">
          <tr>
            <th className="th pl-5">Team</th>
            <th className="th text-right">Members</th>
            <th className="th text-right">Attendance</th>
            <th className="th text-right">KPI achievement</th>
            <th className="th text-right">KPIs below 80%</th>
            <th className="th text-right">Reporting</th>
            <th className="th text-right">Reviewed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {perf.byTeam.map((t) => (
            <tr key={t.team.id}>
              <td className="td pl-5"><Link href={`/analytics/teams/${t.team.slug}`} className="link">{t.team.name}</Link></td>
              <td className="td text-right tabular-nums">{t.members}</td>
              <td className="td text-right"><PctCell value={t.attendance} /></td>
              <td className="td text-right"><PctCell value={t.kpi} /></td>
              <td className="td text-right tabular-nums">{t.kpiBelow} / {t.kpiCount}</td>
              <td className="td text-right"><PctCell value={t.reporting} /></td>
              <td className="td text-right tabular-nums">{t.reportsReviewed} / {t.reportsSubmitted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- Team

/** HQ sections surfaced on the Alumni / Campus Chapter dashboards (PRD §5.4). */
const TEAM_ACTIVITY_SECTIONS: Record<string, { space: string; sections: string[]; title: string }> = {
  alumni: { space: "alumni", sections: ["activities", "engagement-plans"], title: "Alumni departmental activities & progress" },
  "campus-chapter": { space: "campus", sections: ["activities", "development"], title: "Campus Chapter activities & development progress" },
};

async function TeamActivities({ team }: { team: Team }) {
  const cfg = TEAM_ACTIVITY_SECTIONS[team.slug];
  if (!cfg) return null;
  const space = getSpace(cfg.space)!;
  const records = await prisma.hqRecord.findMany({
    where: { space: cfg.space, section: { in: cfg.sections } },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
  return (
    <Card title={cfg.title} actions={<Link href={`/hq/${cfg.space}`} className="link text-sm">Open in HQ</Link>}>
      <p className="mb-3 text-xs text-muted">
        Recorded in the {space.title} HQ workspace. These are departmental activities — separate from the team&apos;s internal performance records above.
      </p>
      {records.length === 0 ? (
        <EmptyState>No activities recorded in HQ yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {records.map((r) => {
            const d = parseData(r.data);
            const section = space.sections.find((s) => s.key === r.section)!;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/hq/${cfg.space}/${r.section}/${r.id}`} className="link">{d.title || "Untitled"}</Link>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {section.title}
                  {d.date && <> · {formatDate(d.date)}</>}
                  {d.participants && <> · {d.participants} participants</>}
                  {d.stage && <Badge tone="info">{d.stage}</Badge>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function summarySentence(name: string, perf: Performance) {
  const parts: string[] = [];
  const add = (label: string, v: number | null) => {
    if (v === null) parts.push(`${label}: no data yet`);
    else parts.push(`${label} ${pct(v)} (${v >= BENCHMARK ? "meets" : "below"} benchmark)`);
  };
  add("attendance", perf.attendance.rate);
  add("KPI achievement", perf.kpi.average);
  add("reporting", perf.reporting.rate);
  return `${name} over the last ${perf.weeks.length} weeks — ${parts.join("; ")}.`;
}

export async function TeamDashboard({ team, weeks }: { team: Team; weeks: number }) {
  const periods = recentWeeks(weeks);
  const week = currentWeek();
  const month = currentMonth();
  const [perf, status, kpis, evals, head] = await Promise.all([
    getPerformance({ teamIds: [team.id], weeks: periods }),
    reportingStatus(week, [team.id]),
    prisma.kpi.findMany({ where: { teamId: team.id, period: week }, orderBy: { name: "asc" } }),
    prisma.evaluation.findMany({ where: { teamId: team.id }, orderBy: [{ month: "desc" }, { updatedAt: "desc" }], take: 8, include: { user: true } }),
    prisma.user.findFirst({ where: { teamId: team.id, role: "HEAD", active: true } }),
  ]);
  const evaluatedThisMonth = new Set(evals.filter((e) => e.month === month).map((e) => e.userId));

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink">
        <strong className="text-brand">Summary.</strong> {summarySentence(team.name, perf)}
        {head && <span className="text-muted"> Department Head: {head.name}.</span>}
      </p>
      <HeadlineTiles perf={perf} />
      <Card title="Departmental performance trend">
        <TrendChart data={trendData(perf)} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`KPI records · ${weekLabel(week)}`} actions={<Link href={`/analytics/kpis?team=${team.id}`} className="link text-sm">KPI matrix</Link>}>
          {kpis.length === 0 ? (
            <EmptyState>No KPIs recorded for this week.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {kpis.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>{k.name}</span>
                  <span className="flex items-center gap-2 tabular-nums text-muted">
                    {k.actual ?? "—"} / {k.target} {k.unit} · {pct(kpiAchievement(k))}
                    <KpiStatusBadge status={kpiStatus(k)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Reporting status · ${weekLabel(week)}`} actions={<Link href={`/analytics/reports?team=${team.id}`} className="link text-sm">Reports</Link>}>
          {status.length === 0 ? (
            <EmptyState>No team members yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {status.map((s) => (
                <li key={s.member.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  {s.report ? <Link href={`/analytics/reports/${s.report.id}`} className="link">{s.member.name}</Link> : <span>{s.member.name}</span>}
                  <ReportStatusBadge status={s.report?.status ?? null} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Individual team members">
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-line">
              <tr>
                <th className="th pl-5">Member</th>
                <th className="th text-right">Attendance</th>
                <th className="th text-right">Sessions</th>
                <th className="th text-right">Absences</th>
                <th className="th text-right">Reporting</th>
                <th className="th">{monthLabel(month)} evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {perf.byMember.map((m) => (
                <tr key={m.member.id}>
                  <td className="td pl-5">
                    <Link href={`/analytics/people/${m.member.id}`} className="link">{m.member.name}</Link>
                    <p className="text-xs text-muted">{m.member.position}</p>
                  </td>
                  <td className="td text-right"><PctCell value={m.attendance} /></td>
                  <td className="td text-right tabular-nums">{m.sessions}</td>
                  <td className="td text-right tabular-nums">{m.absences}</td>
                  <td className="td text-right"><PctCell value={m.reporting} /></td>
                  <td className="td">{evaluatedThisMonth.has(m.member.id) ? <Badge tone="good">Recorded</Badge> : <Badge>Not yet</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Monthly evaluations" actions={<Link href={`/analytics/evaluations?team=${team.id}`} className="link text-sm">All</Link>}>
        {evals.length === 0 ? (
          <EmptyState>No evaluations recorded yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {evals.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <Link href={`/analytics/evaluations/${e.id}`} className="link">{e.user.name}</Link>
                <span className="text-muted"> · {monthLabel(e.month)}</span>
                {e.remarks && <p className="line-clamp-1 text-muted">{e.remarks}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <TeamActivities team={team} />
      <MetricNotes />
    </div>
  );
}

// ---------------------------------------------------------------- Person

export async function PersonDashboard({ person, weeks }: { person: User & { team: Team | null }; weeks: number }) {
  const periods = recentWeeks(weeks);
  const week = currentWeek();
  const teamIds = person.teamId ? [person.teamId] : [];
  const [perf, attendance, reports, evals, kpis] = await Promise.all([
    getPerformance({ teamIds, userId: person.id, weeks: periods }),
    prisma.attendance.findMany({ where: { userId: person.id }, orderBy: { date: "desc" }, take: 10 }),
    prisma.weeklyReport.findMany({ where: { userId: person.id }, orderBy: { period: "desc" }, take: 8 }),
    prisma.evaluation.findMany({ where: { userId: person.id }, orderBy: { month: "desc" }, take: 12 }),
    person.teamId ? prisma.kpi.findMany({ where: { teamId: person.teamId, period: week }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  const submittedThisWeek = reports.find((r) => r.period === week);
  const space = person.team ? SPACES.find((s) => s.teamSlug === person.team!.slug) : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Attendance" value={pct(perf.attendance.rate)} benchmark={perf.attendance.rate} sub={`${perf.attendance.total} sessions recorded`} />
        <StatTile label="Reports submitted" value={`${perf.reporting.submitted} / ${periods.length}`} benchmark={perf.reporting.rate} sub={`Last ${periods.length} weeks`} />
        <StatTile label="Team KPI achievement" value={pct(perf.kpi.average)} benchmark={perf.kpi.average} sub={person.team?.name ?? "No team"} />
        <StatTile
          label="This week's report"
          value={submittedThisWeek ? (submittedThisWeek.status === "REVIEWED" ? "Reviewed" : "Submitted") : "Not submitted"}
          sub={weekLabel(week)}
        />
      </div>

      <Card title="Personal performance trend">
        <TrendChart data={trendData(perf)} />
        <p className="mt-1 text-xs text-muted">Reporting shows 100% for weeks with a submitted report. KPI achievement is the team&apos;s weekly average.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Attendance history" actions={<Link href={`/analytics/attendance?person=${person.id}`} className="link text-sm">All</Link>}>
          {attendance.length === 0 ? (
            <EmptyState>No attendance recorded yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {attendance.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {formatDate(a.date)} <span className="text-muted">· {a.session}</span>
                  </span>
                  <Badge tone={ATTENDANCE_TONE[a.status]}>{ATTENDANCE_LABEL[a.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Weekly reports" actions={<Link href={`/analytics/reports?person=${person.id}`} className="link text-sm">All</Link>}>
          {reports.length === 0 ? (
            <EmptyState>No reports submitted yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <Link href={`/analytics/reports/${r.id}`} className="link">{weekLabel(r.period)}</Link>
                  <ReportStatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Team KPIs · ${weekLabel(week)}`} actions={<Link href="/analytics/kpis" className="link text-sm">KPI matrix</Link>}>
          {kpis.length === 0 ? (
            <EmptyState>No KPIs recorded for this week.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {kpis.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>{k.name}</span>
                  <KpiStatusBadge status={kpiStatus(k)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Monthly evaluation history">
          {evals.length === 0 ? (
            <EmptyState>No evaluations yet.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {evals.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <Link href={`/analytics/evaluations/${e.id}`} className="link">{monthLabel(e.month)}</Link>
                  {e.strengths && <p className="line-clamp-1 text-muted">Strengths: {e.strengths}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {person.team && (
        <Card title="Departmental information">
          <p className="text-sm">
            You are in <strong>{person.team.name}</strong>.{" "}
            {space && (
              <>
                Plans, records and documentation are in the <Link href={`/hq/${space.key}`} className="link">{space.title} HQ workspace</Link>.
              </>
            )}{" "}
            Find colleagues in the <Link href={`/directory?team=${person.team.id}`} className="link">team directory</Link>.
          </p>
        </Card>
      )}
      <MetricNotes />
    </div>
  );
}
