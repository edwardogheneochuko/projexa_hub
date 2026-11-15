"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, canViewPerson } from "@/lib/permissions";
import { currentWeek, isValidDate, isValidMonth, isValidWeek } from "@/lib/periods";
import { isSafeUrl } from "@/lib/hq";
import { splitLinks, type ActionResult } from "@/lib/utils";
import { checklistFor, monthlyAverage } from "@/lib/checklist";
import { itemScore, overallScore } from "@/lib/checklist-score";

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
const str = (fd: FormData, k: string, max = 5000) => String(fd.get(k) ?? "").trim().slice(0, max);

// ------------------------------------------------------------------ Attendance

export async function recordAttendance(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const teamId = str(fd, "teamId");
  const date = str(fd, "date");
  const session = str(fd, "session", 200);
  if (!canManageTeam(user, teamId)) return { error: "You can't record attendance for this team." };
  if (!isValidDate(date)) return { error: "Choose a valid date." };
  if (!session) return { error: "Enter the meeting or training session name." };

  const memberIds = fd.getAll("member").map(String);
  const members = await prisma.user.findMany({ where: { id: { in: memberIds }, teamId }, select: { id: true } });
  const valid = new Set(members.map((m) => m.id));

  let saved = 0;
  for (const userId of memberIds) {
    if (!valid.has(userId)) continue;
    const status = str(fd, `status_${userId}`);
    if (!STATUSES.includes(status)) continue; // "not recorded"
    const remarks = str(fd, `remarks_${userId}`, 500);
    await prisma.attendance.upsert({
      where: { userId_date_session: { userId, date, session } },
      create: { userId, teamId, date, session, status, remarks, recordedById: user.id },
      update: { status, remarks, recordedById: user.id, teamId },
    });
    saved++;
  }
  revalidatePath("/analytics", "layout");
  return { ok: `Saved attendance for ${saved} ${saved === 1 ? "person" : "people"}.` };
}

export async function deleteAttendance(id: string) {
  const user = await requireUser();
  const rec = await prisma.attendance.findUnique({ where: { id } });
  if (!rec || !canManageTeam(user, rec.teamId)) return;
  await prisma.attendance.delete({ where: { id } });
  revalidatePath("/analytics", "layout");
}

// ------------------------------------------------------------------ KPIs

export async function saveKpi(id: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const teamId = str(fd, "teamId");
  if (!canManageTeam(user, teamId)) return { error: "You can't manage KPIs for this team." };
  if (id) {
    const existing = await prisma.kpi.findUnique({ where: { id } });
    if (!existing || !canManageTeam(user, existing.teamId)) return { error: "KPI not found." };
  }
  const name = str(fd, "name", 200);
  const period = str(fd, "period");
  const target = Number(str(fd, "target"));
  const actualRaw = str(fd, "actual");
  const actual = actualRaw === "" ? null : Number(actualRaw);
  if (!name) return { error: "Enter the KPI name." };
  if (!isValidWeek(period)) return { error: "Choose a valid reporting week." };
  if (!(target > 0)) return { error: "Target must be a number greater than zero." };
  if (actual !== null && (isNaN(actual) || actual < 0)) return { error: "Actual result must be a number of zero or more." };

  const data = {
    teamId,
    name,
    period,
    target,
    actual,
    description: str(fd, "description", 1000),
    unit: str(fd, "unit", 40),
    remarks: str(fd, "remarks", 1000),
    updatedById: user.id,
  };
  if (id) await prisma.kpi.update({ where: { id }, data });
  else await prisma.kpi.create({ data });
  revalidatePath("/analytics", "layout");
  redirect(`/analytics/kpis?team=${teamId}&period=${period}`);
}

export async function deleteKpi(id: string) {
  const user = await requireUser();
  const k = await prisma.kpi.findUnique({ where: { id } });
  if (!k || !canManageTeam(user, k.teamId)) return;
  await prisma.kpi.delete({ where: { id } });
  revalidatePath("/analytics", "layout");
  redirect(`/analytics/kpis?team=${k.teamId}&period=${k.period}`);
}

/** Start a week's matrix from the previous week's KPI definitions (results left blank). */
export async function copyKpis(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const teamId = str(fd, "teamId");
  const from = str(fd, "from");
  const to = str(fd, "to");
  if (!canManageTeam(user, teamId)) return { error: "You can't manage KPIs for this team." };
  if (!isValidWeek(from) || !isValidWeek(to) || from === to) return { error: "Choose two different weeks." };
  const [source, existing] = await Promise.all([
    prisma.kpi.findMany({ where: { teamId, period: from } }),
    prisma.kpi.findMany({ where: { teamId, period: to }, select: { name: true } }),
  ]);
  const have = new Set(existing.map((e) => e.name.toLowerCase()));
  const toCreate = source.filter((k) => !have.has(k.name.toLowerCase()));
  if (!toCreate.length) return { error: "Nothing to copy — no new KPIs found in the source week." };
  await prisma.kpi.createMany({
    data: toCreate.map((k) => ({
      teamId, period: to, name: k.name, description: k.description, target: k.target, unit: k.unit, actual: null, updatedById: user.id,
    })),
  });
  revalidatePath("/analytics", "layout");
  return { ok: `Copied ${toCreate.length} KPI${toCreate.length === 1 ? "" : "s"} into ${to}.` };
}

// ------------------------------------------------------------------ Weekly reports

export async function submitReport(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.teamId) return { error: "You need to belong to a team to submit reports." };
  const period = str(fd, "period");
  if (!isValidWeek(period)) return { error: "Choose a valid reporting week." };
  if (period > currentWeek()) return { error: "You can't submit a report for a future week." };

  const contributions = str(fd, "contributions");
  if (!contributions) return { error: "Describe your contributions during the period." };
  const links = splitLinks(str(fd, "links", 4000));
  const bad = links.find((l) => !isSafeUrl(l));
  if (bad) return { error: `"${bad}" is not a valid web link. Use full addresses starting with https://` };

  const existing = await prisma.weeklyReport.findUnique({ where: { userId_period: { userId: user.id, period } } });
  if (existing?.status === "REVIEWED") return { error: "This report has already been reviewed and can no longer be edited." };

  // Weekly checklist (PRD §4.2): every item must be answered validly; the score is calculated here.
  const checklist = await checklistFor(user);
  const answers: { itemId: string; sortOrder: number; title: string; method: string; target: number | null; unit: string; weight: number; value: number; score: number; note: string }[] = [];
  if (checklist) {
    for (const [n, item] of checklist.items.entries()) {
      const raw = str(fd, `ans_${item.id}`, 30);
      const value = raw === "" ? null : Number(raw);
      const score = itemScore(item, value);
      if (score === null) {
        return { error: `Checklist item ${n + 1} (“${item.title}”) needs a valid answer${item.method === "TARGET" ? " — a number of 0 or more" : ""}.` };
      }
      answers.push({ itemId: item.id, sortOrder: n, title: item.title, method: item.method, target: item.target, unit: item.unit, weight: item.weight, value: value!, score, note: str(fd, `note_${item.id}`, 300) });
    }
  }
  const score = checklist ? overallScore(answers) : null;

  const data = {
    kpiResults: str(fd, "kpiResults"),
    contributions,
    challenges: str(fd, "challenges"),
    remarks: str(fd, "remarks"),
    links: links.join("\n"),
    checklistId: checklist?.id ?? null,
    score,
    benchmark: checklist?.benchmark ?? null,
  };
  const report = await prisma.$transaction(async (tx) => {
    const r = existing
      ? await tx.weeklyReport.update({ where: { id: existing.id }, data })
      : await tx.weeklyReport.create({ data: { ...data, userId: user.id, teamId: user.teamId!, period } });
    await tx.checklistAnswer.deleteMany({ where: { reportId: r.id } });
    if (answers.length) await tx.checklistAnswer.createMany({ data: answers.map((a) => ({ ...a, reportId: r.id })) });
    return r;
  });
  revalidatePath("/analytics", "layout");
  redirect(`/analytics/reports/${report.id}`);
}

/** Review a weekly report with feedback (PRD §4.2 "Founders' review and feedback"). The author then sees it. */
export async function reviewReport(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const r = await prisma.weeklyReport.findUnique({ where: { id } });
  if (!r || !canManageTeam(user, r.teamId) || r.userId === user.id) return { error: "You can't review this report." };
  if (r.status === "REVIEWED") return { error: "This report has already been reviewed." };
  await prisma.weeklyReport.update({
    where: { id },
    data: { status: "REVIEWED", reviewedById: user.id, reviewedAt: new Date(), feedback: str(fd, "feedback", 2000) },
  });
  revalidatePath("/analytics", "layout");
  revalidatePath("/dashboard", "layout");
  return { ok: "Marked as reviewed. The author can now see your feedback." };
}

// ------------------------------------------------------------------ Evaluations

export async function saveEvaluation(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const userId = str(fd, "userId");
  const month = str(fd, "month");
  const subject = await prisma.user.findUnique({ where: { id: userId } });
  if (!subject || !subject.teamId || !canManageTeam(user, subject.teamId)) return { error: "You can't evaluate this person." };
  if (subject.id === user.id) return { error: "You can't evaluate yourself." };
  if (!isValidMonth(month)) return { error: "Choose a valid month." };

  const data = {
    attendance: str(fd, "attendance"),
    kpi: str(fd, "kpi"),
    reporting: str(fd, "reporting"),
    contributions: str(fd, "contributions"),
    strengths: str(fd, "strengths"),
    improvements: str(fd, "improvements"),
    remarks: str(fd, "remarks"),
    evaluatorId: user.id,
    teamId: subject.teamId,
  };
  if (!data.remarks && !data.strengths && !data.improvements) {
    return { error: "Add at least strengths, areas for improvement or remarks." };
  }
  // Monthly evaluation based on weekly performance (PRD §4.2): the month's average checklist score.
  const monthly = await monthlyAverage(userId, month);
  const withScore = { ...data, score: monthly.average, scoredReports: monthly.count };
  const ev = await prisma.evaluation.upsert({
    where: { userId_month: { userId, month } },
    create: { ...withScore, userId, month },
    update: withScore,
  });
  revalidatePath("/analytics", "layout");
  redirect(`/analytics/evaluations/${ev.id}`);
}

export async function deleteEvaluation(id: string) {
  const user = await requireUser();
  const ev = await prisma.evaluation.findUnique({ where: { id }, include: { user: true } });
  if (!ev || !canManageTeam(user, ev.teamId) || !canViewPerson(user, ev.user)) return;
  await prisma.evaluation.delete({ where: { id } });
  revalidatePath("/analytics", "layout");
  redirect("/analytics/evaluations");
}
