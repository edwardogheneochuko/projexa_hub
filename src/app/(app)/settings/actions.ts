"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { EMAIL_DOMAIN, isValidEmail, isValidUsername, normaliseEmail, toEmail } from "@/lib/accounts";
import { changeEmail, emailTaken, mailError, sendInvite, sendReset } from "@/lib/account-mail";
import { INVITE_DAYS, INVITE_ROLES, newInviteCode } from "@/lib/invites";
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

  // The person's real email: invites and password-reset links go there.
  const contactEmail = normaliseEmail(str(fd, "contactEmail", 200));
  if (!id && !contactEmail) return { error: "Enter the person's email address. Their invite is sent there." };
  if (contactEmail && !isValidEmail(contactEmail)) return { error: "Enter a valid email address, e.g. name@gmail.com." };
  if (contactEmail && contactEmail.endsWith(`@${EMAIL_DOMAIN}`)) return { error: `Use a real inbox (e.g. Gmail), not a @${EMAIL_DOMAIN} sign-in name.` };
  if (contactEmail && (await emailTaken(contactEmail, id ?? undefined))) return { error: "Another account already uses this email address." };

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
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { error: "This account no longer exists." };
    const updated = await prisma.user.update({ where: { id }, data });
    if (contactEmail && contactEmail !== existing.contactEmail && contactEmail !== existing.pendingEmail) {
      try {
        const r = await changeEmail(updated, contactEmail);
        return { ok: r === "invite-resent" ? `Saved. The invite was sent to ${contactEmail}.` : `Saved. A confirmation link was sent to ${contactEmail}; the current email stays in use until it's confirmed.` };
      } catch (e) {
        return { error: `Saved, but the email couldn't be sent: ${mailError(e)}` };
      }
    }
    redirect("/settings");
  }
  // New people join through Settings → Team invitations; this form only edits existing accounts.
  return { error: "To add people, create a link in Settings → Team invitations." };
}

/** Settings → Team invitations: create a shareable sign-up link for a department and role. */
export async function createTeamInvite(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const founder = await requireFounder();
  const teamId = str(fd, "teamId") || null;
  const role = str(fd, "role");
  const days = Number(str(fd, "days"));
  const maxRaw = str(fd, "maxUses");
  const maxUses = maxRaw ? Number(maxRaw) : null;
  if (!INVITE_ROLES[role]) return { error: "Choose a role." };
  if (teamId && !(await prisma.team.findUnique({ where: { id: teamId } }))) return { error: "That department no longer exists." };
  if (!INVITE_DAYS.includes(days)) return { error: "Choose how long the link stays valid." };
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500)) return { error: "Number of people must be between 1 and 500, or left empty." };
  await prisma.teamInvite.create({
    data: { code: newInviteCode(), teamId, role, maxUses, expiresAt: new Date(Date.now() + days * 86_400_000), createdById: founder.id },
  });
  revalidatePath("/settings/invitations");
  return { ok: "Link created. Copy it from the list below and share it with your team." };
}

export async function revokeTeamInvite(id: string) {
  await requireFounder();
  await prisma.teamInvite.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath("/settings/invitations");
}

/** Send the invite again (lost email, or the 2-day link expired). */
export async function resendInvite(id: string): Promise<ActionResult> {
  await requireFounder();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user?.active) return { error: "Reactivate the account first." };
  if (user.passwordHash) return { error: "This person has already set up their account. Send a password-reset email instead." };
  try {
    await sendInvite(user);
  } catch (e) {
    return { error: mailError(e) };
  }
  revalidatePath("/settings");
  return { ok: `Invite sent again to ${user.contactEmail}. Earlier invite links no longer work.` };
}

/** Email the person a password-reset link (their current password keeps working until they use it). */
export async function sendPasswordReset(id: string): Promise<ActionResult> {
  await requireFounder();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user?.active) return { error: "Reactivate the account first." };
  try {
    await sendReset(user);
  } catch (e) {
    return { error: mailError(e) };
  }
  await prisma.user.update({ where: { id }, data: { resetRequestedAt: null } });
  revalidatePath("/settings");
  return { ok: `Password-reset link sent to ${user.contactEmail}.` };
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
