// Data for the Founder / Department Head dashboards (Team Overview, Team Reviews, Performance Review).
// Everything is scoped to the teams the viewer manages: all teams for the Founder, their own for a Head.
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CurrentUser } from "./auth";
import { requireUser } from "./auth";
import { isFounder, isHead, managedTeamIds } from "./permissions";
import { getPerformance, kpiAverage } from "./metrics";
import { currentMonth, formatDate, recentMonths, recentWeeks, weekRange, weekShort, weeksOfMonth } from "./periods";

export const PAGE_SIZE = 10;

/** Dashboards are for the Founder and Department Heads. Team Members go to their own dashboard. */
export async function requireLeader(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isFounder(user) && !isHead(user)) redirect("/analytics");
  return user;
}

export async function scopeTeams(user: CurrentUser) {
  const managed = managedTeamIds(user);
  return prisma.team.findMany({ where: managed === null ? {} : { id: { in: managed } }, orderBy: { sortOrder: "asc" } });
}

export const ROLE_NAMES: Record<string, string> = { HEAD: "Team Leader", MEMBER: "Team Member" };

export function pageOf(raw: string, total: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(raw) || 1), pages);
  return { page, pages, skip: (page - 1) * PAGE_SIZE };
}

// ------------------------------------------------------------------ Team Overview

export async function overviewData(
  teamIds: string[],
  f: { team: string; role: string; status: string; q: string; page: string; view: "weekly" | "monthly" },
) {
  const inScope = { role: { not: "FOUNDER" }, teamId: { in: teamIds } } satisfies Prisma.UserWhereInput;
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);

  const where: Prisma.UserWhereInput = { ...inScope };
  if (f.team && teamIds.includes(f.team)) where.teamId = f.team;
  if (f.role === "HEAD" || f.role === "MEMBER") where.role = f.role;
  if (f.status === "active") where.active = true;
  if (f.status === "inactive") where.active = false;
  if (f.q) where.name = { contains: f.q, mode: "insensitive" };

  const [total, active, joined, filtered] = await Promise.all([
    prisma.user.count({ where: inScope }),
    prisma.user.count({ where: { ...inScope, active: true } }),
    prisma.user.count({ where: { ...inScope, createdAt: { gte: monthAgo } } }),
    prisma.user.count({ where }),
  ]);
  const { page, pages, skip } = pageOf(f.page, filtered);
  const members = await prisma.user.findMany({
    where,
    include: { team: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    skip,
    take: PAGE_SIZE,
  });

  // Weekly Performance Score = average KPI achievement (capped at 100% per KPI), per week or per month.
  let chart: { label: string; value: number | null }[];
  let range: string;
  if (f.view === "monthly") {
    const months = recentMonths(6).reverse();
    const weeksBy = new Map(months.map((m) => [m, weeksOfMonth(m)]));
    const kpis = await prisma.kpi.findMany({
      where: { teamId: { in: teamIds }, period: { in: [...weeksBy.values()].flat() } },
      select: { period: true, target: true, actual: true },
    });
    chart = months.map((m) => ({
      label: new Date(`${m}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" }),
      value: kpiAverage(kpis.filter((k) => weeksBy.get(m)!.includes(k.period))),
    }));
    range = `${chart[0].label} – ${chart[chart.length - 1].label} ${months[months.length - 1].slice(0, 4)}`;
  } else {
    const weeks = recentWeeks(7);
    const kpis = await prisma.kpi.findMany({
      where: { teamId: { in: teamIds }, period: { in: weeks } },
      select: { period: true, target: true, actual: true },
    });
    chart = weeks.map((w) => ({ label: weekShort(w), value: kpiAverage(kpis.filter((k) => k.period === w)) }));
    range = `${formatDate(weekRange(weeks[0]).from)} – ${formatDate(weekRange(weeks[weeks.length - 1]).to)}`;
  }

  return {
    stats: { total, active, inactive: total - active, departments: teamIds.length, joined },
    chart,
    range,
    members,
    page,
    pages,
    filtered,
  };
}

// ------------------------------------------------------------------ Team Reviews

export async function reviewsData(teamIds: string[], f: { order: "highest" | "lowest"; team: string; page: string }) {
  const month = currentMonth();
  const [activeMembers, evaluations] = await Promise.all([
    prisma.user.count({ where: { role: { not: "FOUNDER" }, active: true, teamId: { in: teamIds } } }),
    prisma.evaluation.count({ where: { month, teamId: { in: teamIds }, user: { active: true } } }),
  ]);

  // Last four weeks, current week included (matches the rest of the app's dashboards).
  const perf = await getPerformance({ teamIds, weeks: recentWeeks(4) });
  const reviewedShare = perf.reporting.submitted ? (perf.reporting.reviewed / perf.reporting.submitted) * 100 : null;

  const ranked = perf.byTeam
    .filter((t) => t.kpi !== null)
    .sort((a, b) => (f.order === "lowest" ? a.kpi! - b.kpi! : b.kpi! - a.kpi!))
    .slice(0, 5)
    .map((t) => ({ name: t.team.name, value: t.kpi! }));

  // Department trend: last complete week vs the one before, and the last four complete weeks.
  const done = recentWeeks(6).slice(0, 5); // excludes the current, unfinished week
  const kpis = await prisma.kpi.findMany({
    where: { teamId: { in: teamIds }, period: { in: done } },
    select: { teamId: true, period: true, target: true, actual: true },
  });
  const teams = await prisma.team.findMany({
    where: { id: { in: f.team && teamIds.includes(f.team) ? [f.team] : teamIds } },
    orderBy: { sortOrder: "asc" },
  });
  const [lastWeek, prevWeek] = [done[4], done[3]];
  const trendRows = teams.map((t) => {
    const tk = kpis.filter((k) => k.teamId === t.id);
    const weekly = kpiAverage(tk.filter((k) => k.period === lastWeek));
    const previous = kpiAverage(tk.filter((k) => k.period === prevWeek));
    const monthly = kpiAverage(tk.filter((k) => done.slice(1).includes(k.period)));
    const trend = weekly === null || previous === null ? null : weekly > previous ? "up" : weekly < previous ? "down" : "flat";
    return { team: t, weekly, monthly, trend: trend as "up" | "down" | "flat" | null };
  });
  const { page, pages, skip } = pageOf(f.page, trendRows.length);

  return {
    month,
    stats: { total: activeMembers, completed: evaluations, pending: Math.max(0, activeMembers - evaluations), average: perf.kpi.average },
    rings: [
      { label: "Attendance", value: perf.attendance.rate },
      { label: "KPI Achievement", value: perf.kpi.average },
      { label: "Report Consistency", value: perf.reporting.rate },
      { label: "Reports Reviewed", value: reviewedShare },
    ],
    ranked,
    trendRows: trendRows.slice(skip, skip + PAGE_SIZE),
    page,
    pages,
    lastWeek,
  };
}

// ------------------------------------------------------------------ Performance Review

export async function reportsData(teamIds: string[], f: { tab: "weekly" | "monthly"; team: string; status: string; q: string; page: string }) {
  const teamFilter = { teamId: f.team && teamIds.includes(f.team) ? f.team : { in: teamIds } };
  const nameFilter = f.q ? { user: { name: { contains: f.q, mode: "insensitive" as const } } } : {};

  const [weekly, reviewed, monthly] = await Promise.all([
    prisma.weeklyReport.count({ where: { teamId: { in: teamIds } } }),
    prisma.weeklyReport.count({ where: { teamId: { in: teamIds }, status: "REVIEWED" } }),
    prisma.evaluation.count({ where: { teamId: { in: teamIds } } }),
  ]);

  type Row = { id: string; href: string; name: string; avatarUrl: string; team: string; date: Date; status: string };
  let rows: Row[];
  let filtered: number;
  let paging: ReturnType<typeof pageOf>;

  if (f.tab === "monthly") {
    // Monthly evaluations are complete once written, so the only status is "Completed".
    const where: Prisma.EvaluationWhereInput = { ...teamFilter, ...nameFilter };
    if (f.status && f.status !== "COMPLETED") where.id = "__none__";
    filtered = await prisma.evaluation.count({ where });
    paging = pageOf(f.page, filtered);
    const list = await prisma.evaluation.findMany({
      where,
      include: { user: true, team: true },
      orderBy: { updatedAt: "desc" },
      skip: paging.skip,
      take: PAGE_SIZE,
    });
    rows = list.map((e) => ({ id: e.id, href: `/analytics/evaluations/${e.id}`, name: e.user.name, avatarUrl: e.user.avatarUrl, team: e.team.name, date: e.updatedAt, status: "Completed" }));
  } else {
    const where: Prisma.WeeklyReportWhereInput = { ...teamFilter, ...nameFilter };
    if (f.status === "SUBMITTED" || f.status === "REVIEWED") where.status = f.status;
    filtered = await prisma.weeklyReport.count({ where });
    paging = pageOf(f.page, filtered);
    const list = await prisma.weeklyReport.findMany({
      where,
      include: { user: true, team: true },
      orderBy: { createdAt: "desc" },
      skip: paging.skip,
      take: PAGE_SIZE,
    });
    rows = list.map((r) => ({
      id: r.id,
      href: `/analytics/reports/${r.id}`,
      name: r.user.name,
      avatarUrl: r.user.avatarUrl,
      team: r.team.name,
      date: r.createdAt,
      status: r.status === "REVIEWED" ? "Reviewed" : "Submitted",
    }));
  }

  return { stats: { total: weekly + monthly, weekly, monthly, reviewed }, rows, filtered, ...paging };
}
