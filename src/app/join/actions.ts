"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { EMAIL_DOMAIN, MIN_PASSWORD, createLink, isValidEmail, isValidUsername, normaliseEmail, toEmail } from "@/lib/accounts";
import { sendLinkEmail } from "@/lib/mail";
import { STATUS_TEXT, findInvite } from "@/lib/invites";
import type { ActionResult } from "@/lib/utils";

const str = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);

/**
 * Sign up through a team invitation link. The account is created straight away but can't be used
 * until the person clicks the verification link emailed to them.
 */
export async function joinTeam(code: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { status, invite } = await findInvite(code);
  if (status !== "ok" || !invite) return { error: STATUS_TEXT[status === "ok" ? "invalid" : status] };

  const name = str(fd, "name", 120);
  const username = str(fd, "username", 40).toLowerCase().replace(/@.*$/, "");
  const contactEmail = normaliseEmail(str(fd, "contactEmail"));
  const password = String(fd.get("password") ?? "");
  const teamId = invite.teamId ?? str(fd, "teamId");

  if (name.length < 2) return { error: "Enter your full name." };
  if (!isValidUsername(username)) return { error: "Username can use lowercase letters, numbers and . _ - (for example tobi.adeyemi)." };
  if (!teamId || !(await prisma.team.findUnique({ where: { id: teamId } }))) return { error: "Choose your department." };
  if (!isValidEmail(contactEmail)) return { error: "Enter a valid email address, e.g. name@gmail.com." };
  if (contactEmail.endsWith(`@${EMAIL_DOMAIN}`)) return { error: `Use your real inbox (e.g. Gmail), not a @${EMAIL_DOMAIN} address.` };
  if (password.length < MIN_PASSWORD) return { error: `Choose a password of at least ${MIN_PASSWORD} characters.` };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The two passwords don't match." };

  if (await prisma.user.findUnique({ where: { email: toEmail(username) } })) return { error: `The username ${username} is already taken. Try another.` };
  if (await prisma.user.findFirst({ where: { OR: [{ contactEmail }, { pendingEmail: contactEmail }] } })) {
    return { error: "An account already uses this email address. If it's yours, sign in or use “Forgot password?”." };
  }

  // Count the use and create the account together, so a link limited to N people can't be overused.
  let userId: string;
  try {
    userId = await prisma.$transaction(async (tx) => {
      const claimed = await tx.teamInvite.updateMany({
        where: { id: invite.id, revokedAt: null, expiresAt: { gt: new Date() }, ...(invite.maxUses !== null ? { uses: { lt: invite.maxUses } } : {}) },
        data: { uses: { increment: 1 } },
      });
      if (claimed.count !== 1) throw new Error("full");
      const u = await tx.user.create({
        data: {
          name,
          email: toEmail(username),
          role: invite.role,
          teamId,
          contactEmail,
          passwordHash: await bcrypt.hash(password, 10),
          joinedViaId: invite.id,
        },
      });
      return u.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "full") return { error: STATUS_TEXT.full };
    return { error: "That username or email was just taken. Try again." };
  }

  try {
    await sendLinkEmail("VERIFY_EMAIL", contactEmail, await createLink(userId, "VERIFY_EMAIL", contactEmail), { name, username });
  } catch (e) {
    console.error("[mail] verification email failed", e);
    return { error: `Your account was created, but the verification email couldn't be sent. Use “Forgot password?” on the sign-in page to send it again, or ask the Founder.` };
  }
  return { ok: `Almost done! We sent a link to ${contactEmail}. Open it to verify your email, then sign in as ${username}.` };
}
