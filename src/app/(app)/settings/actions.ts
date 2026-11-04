"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import type { ActionResult } from "@/lib/utils";

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const ROLES = ["FOUNDER", "HEAD", "MEMBER"];

export async function saveUser(id: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const founder = await requireFounder();
  const name = str(fd, "name", 120);
  const email = str(fd, "email", 200).toLowerCase();
  const role = str(fd, "role");
  const teamId = str(fd, "teamId") || null;
  const password = String(fd.get("password") ?? "");

  if (!name) return { error: "Enter the person's full name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if (role !== "FOUNDER" && !teamId) return { error: "Department Heads and Team Members must belong to a department or team." };
  if (!id && password.length < 8) return { error: "Set a temporary password of at least 8 characters." };
  if (id && password && password.length < 8) return { error: "New password must be at least 8 characters." };

  const active = fd.get("active") === "on";
  if (id === founder.id && (role !== "FOUNDER" || !active)) {
    return { error: "You can't remove your own Founder access or deactivate yourself." };
  }

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash && clash.id !== id) return { error: "Another account already uses this email." };

  const data = {
    name,
    email,
    role,
    teamId,
    position: str(fd, "position", 120),
    canViewFinance: fd.get("canViewFinance") === "on",
    canViewHR: fd.get("canViewHR") === "on",
    active,
    ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
  };
  if (id) await prisma.user.update({ where: { id }, data });
  else await prisma.user.create({ data: { ...data, passwordHash: data.passwordHash! } });
  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function saveTeam(id: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  await requireFounder();
  const name = str(fd, "name", 80);
  const description = str(fd, "description", 400);
  const sortOrder = Number(str(fd, "sortOrder")) || 0;
  if (!name) return { error: "Enter a team name." };
  if (id) {
    await prisma.team.update({ where: { id }, data: { name, description, sortOrder } });
  } else {
    const slug = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return { error: "Team name must contain letters or numbers." };
    if (await prisma.team.findUnique({ where: { slug } })) return { error: "A team with a similar name already exists." };
    await prisma.team.create({ data: { name, description, sortOrder, slug } });
  }
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}
