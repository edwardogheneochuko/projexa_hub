// Which checklist applies to whom, and monthly averages (PRD §4.2).
import { prisma } from "./db";
import { weeksOfMonth } from "./periods";

/**
 * The checklist assigned to a person: the most specific active one.
 * Department + role beats department only, which beats role only, which beats "everyone".
 */
export async function checklistFor(u: { teamId: string | null; role: string }) {
  if (u.role === "FOUNDER") return null;
  const candidates = await prisma.checklist.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ teamId: u.teamId }, { teamId: null }] }, { OR: [{ role: u.role }, { role: null }] }],
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  const rank = (c: { teamId: string | null; role: string | null }) => (c.teamId ? 2 : 0) + (c.role ? 1 : 0);
  return candidates.filter((c) => c.items.length > 0).sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export type ChecklistWithItems = NonNullable<Awaited<ReturnType<typeof checklistFor>>>;

/** Average weekly checklist score for a person in a month ("YYYY-MM"), from their scored weekly reports. */
export async function monthlyAverage(userId: string, month: string) {
  const reports = await prisma.weeklyReport.findMany({
    where: { userId, period: { in: weeksOfMonth(month) }, score: { not: null } },
    select: { score: true, benchmark: true },
  });
  if (!reports.length) return { average: null, count: 0, benchmark: null };
  const average = reports.reduce((s, r) => s + (r.score ?? 0), 0) / reports.length;
  const benchmark = reports.find((r) => r.benchmark !== null)?.benchmark ?? null;
  return { average, count: reports.length, benchmark };
}
