// Performance calculations. These are plain, transparent statistics — no combined or
// weighted score is produced (PRD §5.9). Definitions are shown in the UI via METRIC_NOTES.
import { prisma } from "./db";
import { weekRange, isoWeek, parseDate } from "./periods";
import { kpiAchievement, kpiStatus } from "./kpi";
export { BENCHMARK, kpiAchievement, kpiStatus, type KpiStatus } from "./kpi";

export const METRIC_NOTES = {
  attendance: "Attendance rate = (Present + Late) ÷ (all records − Excused).",
  kpi: "KPI achievement = Actual ÷ Target. Averages cap each KPI at 100% so over-achievement on one KPI cannot hide another below target.",
  reporting: "Reporting rate = weekly reports submitted ÷ (team members × weeks).",
};

type AttRow = { status: string };
export function attendanceRate(rows: AttRow[]): number | null {
  const counted = rows.filter((r) => r.status !== "EXCUSED");
  if (!counted.length) return null;
  const ok = counted.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  return (ok / counted.length) * 100;
}

export function attendanceCounts(rows: AttRow[]) {
  const c = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<string, number>;
  for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
  return c;
}

export function kpiAverage(rows: { target: number; actual: number | null }[]): number | null {
  const vals = rows.map(kpiAchievement).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + Math.min(v, 100), 0) / vals.length;
}

const pctOf = (n: number, d: number) => (d > 0 ? (n / d) * 100 : null);

export type Scope = {
  /** Restrict to these teams (undefined = all teams). */
  teamIds?: string[];
  /** Restrict attendance/report data to one person (KPIs remain team-level). */
  userId?: string;
  /** Weeks in range, oldest first. */
  weeks: string[];
};

export type TrendPoint = { period: string; attendance: number | null; kpi: number | null; reporting: number | null };

export async function getPerformance(scope: Scope) {
  const { weeks } = scope;
  const from = weekRange(weeks[0]).from;
  const to = weekRange(weeks[weeks.length - 1]).to;
  const teamWhere = scope.teamIds ? { teamId: { in: scope.teamIds } } : {};
  const userWhere = scope.userId ? { userId: scope.userId } : {};

  const [teams, members, attendance, kpis, reports] = await Promise.all([
    prisma.team.findMany({
      where: scope.teamIds ? { id: { in: scope.teamIds } } : {},
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { not: "FOUNDER" },
        teamId: scope.teamIds ? { in: scope.teamIds } : { not: null },
        ...(scope.userId ? { id: scope.userId } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, teamId: true, position: true, role: true },
    }),
    prisma.attendance.findMany({
      where: { ...teamWhere, ...userWhere, date: { gte: from, lte: to } },
      select: { userId: true, teamId: true, date: true, status: true },
    }),
    prisma.kpi.findMany({
      where: { ...teamWhere, period: { in: weeks } },
      select: { teamId: true, period: true, target: true, actual: true },
    }),
    prisma.weeklyReport.findMany({
      where: { ...teamWhere, ...userWhere, period: { in: weeks } },
      select: { userId: true, teamId: true, period: true, status: true },
    }),
  ]);

  const attWithWeek = attendance.map((a) => ({ ...a, period: isoWeek(parseDate(a.date)) }));
  const memberIds = new Set(members.map((m) => m.id));
  // Only count reports from current members against expected reports.
  const memberReports = reports.filter((r) => memberIds.has(r.userId));

  const trend: TrendPoint[] = weeks.map((period) => ({
    period,
    attendance: attendanceRate(attWithWeek.filter((a) => a.period === period)),
    kpi: kpiAverage(kpis.filter((k) => k.period === period)),
    reporting: pctOf(memberReports.filter((r) => r.period === period).length, members.length),
  }));

  const byTeam = teams.map((team) => {
    const tm = members.filter((m) => m.teamId === team.id);
    const tk = kpis.filter((k) => k.teamId === team.id);
    const tr = memberReports.filter((r) => r.teamId === team.id);
    return {
      team,
      members: tm.length,
      attendance: attendanceRate(attWithWeek.filter((a) => a.teamId === team.id)),
      kpi: kpiAverage(tk),
      kpiCount: tk.length,
      kpiBelow: tk.filter((k) => kpiStatus(k) === "BELOW").length,
      reporting: pctOf(tr.length, tm.length * weeks.length),
      reportsSubmitted: tr.length,
      reportsReviewed: tr.filter((r) => r.status === "REVIEWED").length,
    };
  });

  const byMember = members.map((m) => {
    const ma = attWithWeek.filter((a) => a.userId === m.id);
    const mr = memberReports.filter((r) => r.userId === m.id);
    return {
      member: m,
      attendance: attendanceRate(ma),
      sessions: ma.length,
      absences: ma.filter((a) => a.status === "ABSENT").length,
      reporting: pctOf(mr.length, weeks.length),
      reportsSubmitted: mr.length,
    };
  });

  return {
    weeks,
    memberCount: members.length,
    attendance: {
      rate: attendanceRate(attendance),
      counts: attendanceCounts(attendance),
      total: attendance.length,
    },
    kpi: {
      average: kpiAverage(kpis),
      count: kpis.length,
      pending: kpis.filter((k) => k.actual === null).length,
      below: kpis.filter((k) => kpiStatus(k) === "BELOW").length,
    },
    reporting: {
      rate: pctOf(memberReports.length, members.length * weeks.length),
      submitted: memberReports.length,
      reviewed: memberReports.filter((r) => r.status === "REVIEWED").length,
      expected: members.length * weeks.length,
    },
    trend,
    byTeam,
    byMember,
  };
}

export type Performance = Awaited<ReturnType<typeof getPerformance>>;

/** Who has / hasn't submitted a report for one week. */
export async function reportingStatus(period: string, teamIds?: string[]) {
  const [members, reports] = await Promise.all([
    prisma.user.findMany({
      where: {
        active: true,
        role: { not: "FOUNDER" },
        teamId: teamIds ? { in: teamIds } : { not: null },
      },
      include: { team: true },
      orderBy: [{ team: { sortOrder: "asc" } }, { name: "asc" }],
    }),
    prisma.weeklyReport.findMany({
      where: { period, ...(teamIds ? { teamId: { in: teamIds } } : {}) },
      select: { id: true, userId: true, status: true },
    }),
  ]);
  const byUser = new Map(reports.map((r) => [r.userId, r]));
  return members.map((m) => ({ member: m, report: byUser.get(m.id) ?? null }));
}
