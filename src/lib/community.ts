// Alumni and Campus Structure analytics (PRD §4.3–4.4), built from the records kept in their HQ workspaces,
// so each activity is recorded once (in HQ) and summarised here.
import { notFound } from "next/navigation";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { getSpace } from "./hq-config";
import { liveTeamSlugs, isLiveSpace, parseData, visibleSections } from "./hq";
import { recentMonths, toDateStr, today } from "./periods";

export async function requireSpace(spaceKey: "alumni" | "campus") {
  const user = await requireUser();
  const space = getSpace(spaceKey)!;
  if (!isLiveSpace(space, await liveTeamSlugs()) || visibleSections(user, space).length === 0) notFound();
  return { user, space };
}

export type Row = { id: string; href: string; data: Record<string, string> };

export async function sectionRows(space: string, section: string, take?: number): Promise<Row[]> {
  const recs = await prisma.hqRecord.findMany({ where: { space, section }, orderBy: { updatedAt: "desc" }, take });
  return recs.map((r) => ({ id: r.id, href: `/hq/${space}/${section}/${r.id}`, data: parseData(r.data) }));
}

const num = (v: string | undefined) => (v && !isNaN(Number(v)) ? Number(v) : 0);

/** Activities and participants per month for the last six months, plus this year's totals. */
export function activitySummary(activities: Row[]) {
  const months = recentMonths(6).reverse();
  const year = toDateStr(today()).slice(0, 4);
  const byMonth = (m: string) => activities.filter((a) => (a.data.date ?? "").startsWith(m));
  const label = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const thisYear = activities.filter((a) => (a.data.date ?? "").startsWith(year));
  const todayStr = toDateStr(today());
  return {
    perMonth: months.map((m) => ({ label: label(m), value: byMonth(m).length })),
    participantsPerMonth: months.map((m) => ({ label: label(m), value: byMonth(m).reduce((s, a) => s + num(a.data.participants), 0) })),
    activitiesThisYear: thisYear.length,
    participantsThisYear: thisYear.reduce((s, a) => s + num(a.data.participants), 0),
    upcoming: activities.filter((a) => (a.data.date ?? "") >= todayStr).sort((a, b) => a.data.date.localeCompare(b.data.date)),
    recent: activities.filter((a) => (a.data.date ?? "") < todayStr).sort((a, b) => b.data.date.localeCompare(a.data.date)),
    year,
  };
}

export const countBy = (rows: Row[], key: string) => {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.data[key] || "Not set";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
};
