"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { MAX_ITEMS, METHODS, type Method } from "@/lib/checklist-score";
import { REP_TEAM_SLUGS } from "@/lib/permissions";
import { INVITE_ROLES } from "@/lib/invites";
import type { ActionResult } from "@/lib/utils";

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const BASE = "/settings/checklists";

/** Create or update a checklist's name, who it applies to, benchmark and active state. */
export async function saveChecklist(id: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireFounder();
  const name = str(fd, "name", 120);
  const teamId = str(fd, "teamId") || null;
  const role = str(fd, "role") || null;
  const benchmark = Number(str(fd, "benchmark"));
  if (!name) return { error: "Give the checklist a name, e.g. “Marketing weekly checklist”." };
  if (role && !INVITE_ROLES[role]) return { error: "Choose a valid role." };
  const team = teamId ? await prisma.team.findUnique({ where: { id: teamId } }) : null;
  if (teamId && !team) return { error: "That department no longer exists." };
  if (role === "REP" && team && !REP_TEAM_SLUGS.includes(team.slug)) return { error: "Representatives only belong to Alumni or Campus Structure." };
  if (!Number.isInteger(benchmark) || benchmark < 1 || benchmark > 100) return { error: "The benchmark must be a whole number from 1 to 100 (%)." };
  const data = { name, teamId, role, benchmark, active: id ? fd.get("active") === "on" : true };
  if (id) {
    await prisma.checklist.update({ where: { id }, data });
    revalidatePath(BASE, "layout");
    return { ok: "Saved." };
  }
  const created = await prisma.checklist.create({ data });
  revalidatePath(BASE);
  redirect(`${BASE}/${created.id}`);
}

/** Add or edit one checklist item, validating its scoring method. */
export async function saveItem(checklistId: string, itemId: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireFounder();
  const checklist = await prisma.checklist.findUnique({ where: { id: checklistId }, include: { _count: { select: { items: true } } } });
  if (!checklist) return { error: "This checklist no longer exists." };
  const title = str(fd, "title", 200);
  const description = str(fd, "description", 600);
  const method = str(fd, "method") as Method;
  const targetRaw = str(fd, "target");
  const target = targetRaw === "" ? null : Number(targetRaw);
  const unit = str(fd, "unit", 30);
  const weight = Number(str(fd, "weight") || "1");

  if (!title) return { error: "Write the expectation, e.g. “Publish 5 social media posts”." };
  if (!METHODS[method]) return { error: "Choose how this item is scored." };
  if (method === "TARGET" && (target === null || !Number.isFinite(target) || target <= 0)) {
    return { error: "A “number against a target” item needs a target greater than 0, e.g. 5." };
  }
  if (!Number.isInteger(weight) || weight < 1 || weight > 10) return { error: "Weight must be a whole number from 1 to 10." };

  const data = { title, description, method, target: method === "TARGET" ? target : null, unit: method === "TARGET" ? unit : "", weight };
  if (itemId) {
    await prisma.checklistItem.updateMany({ where: { id: itemId, checklistId }, data });
  } else {
    if (checklist._count.items >= MAX_ITEMS) return { error: `A checklist has at most ${MAX_ITEMS} items (PRD §4.2).` };
    const last = await prisma.checklistItem.findFirst({ where: { checklistId }, orderBy: { sortOrder: "desc" } });
    await prisma.checklistItem.create({ data: { ...data, checklistId, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  }
  await prisma.checklist.update({ where: { id: checklistId }, data: { updatedAt: new Date() } });
  revalidatePath(`${BASE}/${checklistId}`);
  return { ok: itemId ? "Item saved." : "Item added." };
}

export async function deleteItem(checklistId: string, itemId: string) {
  await requireFounder();
  await prisma.checklistItem.deleteMany({ where: { id: itemId, checklistId } });
  revalidatePath(`${BASE}/${checklistId}`);
}

/** Move an item up or down by swapping it with its neighbour. */
export async function moveItem(checklistId: string, itemId: string, dir: "up" | "down") {
  await requireFounder();
  const items = await prisma.checklistItem.findMany({ where: { checklistId }, orderBy: { sortOrder: "asc" } });
  const i = items.findIndex((x) => x.id === itemId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= items.length) return;
  const order = items.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  await prisma.$transaction(order.map((id, n) => prisma.checklistItem.update({ where: { id }, data: { sortOrder: n + 1 } })));
  revalidatePath(`${BASE}/${checklistId}`);
}

/** Past reports keep their answers and scores; they just stop pointing at the deleted checklist. */
export async function deleteChecklist(id: string) {
  await requireFounder();
  await prisma.checklist.deleteMany({ where: { id } });
  revalidatePath(BASE);
  redirect(BASE);
}
