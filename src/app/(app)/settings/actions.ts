"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { SETUP_CODE_DAYS, isValidUsername, issueSetupCode, toEmail, usernameOf } from "@/lib/accounts";
import type { ActionResult } from "@/lib/utils";

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const ROLES = ["FOUNDER", "HEAD", "MEMBER"];

export async function saveUser(id: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const founder = await requireFounder();
  const name = str(fd, "name", 120);
  const username = str(fd, "username", 40).toLowerCase().replace(/@.*$/, "");
  const role = str(fd, "role");
  const teamId = str(fd, "teamId") || null;

  if (!name) return { error: "Enter the person's full name." };
  if (!isValidUsername(username)) {
    return { error: "Username can use lowercase letters, numbers and . _ - (for example tobi.adeyemi)." };
  }
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if (role !== "FOUNDER" && !teamId) return { error: "Department Heads and Team Members must belong to a department or team." };
  if (teamId && !(await prisma.team.findUnique({ where: { id: teamId } }))) return { error: "That department no longer exists." };

  const active = fd.get("active") === "on";
  if (id === founder.id && (role !== "FOUNDER" || !active)) {
    return { error: "You can't remove your own Founder access or deactivate yourself." };
  }

  const email = toEmail(username);
  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash && clash.id !== id) return { error: `The username ${username} is already taken.` };

  const data = {
    name,
    email,
    role,
    teamId,
    position: str(fd, "position", 120),
    canViewFinance: fd.get("canViewFinance") === "on",
    canViewHR: fd.get("canViewHR") === "on",
    active,
  };
  revalidatePath("/", "layout");
  if (id) {
    if (!(await prisma.user.findUnique({ where: { id } }))) return { error: "This account no longer exists." };
    await prisma.user.update({ where: { id }, data });
    redirect("/settings");
  }
  // New accounts have no password: the person chooses one with the setup code.
  const created = await prisma.user.create({ data });
  const code = await issueSetupCode(created.id);
  return { ok: `Account created for ${name}.`, setupCode: { code, username, days: SETUP_CODE_DAYS } };
}

/** Forgot password / never received the code: issue a fresh setup code. The old password stops working. */
export async function resetUserPassword(id: string): Promise<ActionResult> {
  await requireFounder();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "This account no longer exists." };
  if (!user.active) return { error: "Reactivate the account before resetting its password." };
  const code = await issueSetupCode(user.id);
  revalidatePath("/settings");
  return { ok: `Password reset for ${user.name}. Their old password no longer works.`, setupCode: { code, username: usernameOf(user.email), days: SETUP_CODE_DAYS } };
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
