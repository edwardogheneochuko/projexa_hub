"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/session";
import { MIN_PASSWORD, createLink, findLink, recentLinks, toEmail, consumeLink, usernameOf } from "@/lib/accounts";
import { sendLinkEmail } from "@/lib/mail";
import type { ActionResult } from "@/lib/utils";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

async function startSession(userId: string, sv: number) {
  // Replaces any existing sign-in in this browser, so switching account is just signing in again.
  (await cookies()).set(SESSION_COOKIE, await signSession(userId, sv), SESSION_COOKIE_OPTIONS);
}

function checkNewPassword(fd: FormData): string | null {
  const password = String(fd.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return `Choose a password of at least ${MIN_PASSWORD} characters.`;
  if (password !== String(fd.get("confirm") ?? "")) return "The two passwords don't match.";
  return null;
}

export async function login(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const user = await prisma.user.findUnique({ where: { email: toEmail(username) } });
  // Compare against a dummy hash when there's no password to keep timing similar.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok || !user.active) {
    return { error: "Incorrect username or password." };
  }
  if (user.joinedViaId && !user.emailVerifiedAt) {
    return { error: `Verify your email first: open the link we sent to ${user.contactEmail}. Didn’t get it? Use “Forgot password?” to send it again.` };
  }

  await startSession(user.id, user.sessionVersion);
  redirect("/");
}

/**
 * Forgot password. With a verified email, a reset link is emailed. A person who hasn't accepted their
 * invite yet gets the invite again. Anyone else's request is shown to the Founder in Settings.
 * The answer is the same either way, so this can't be used to find out which usernames exist.
 */
export async function requestPasswordReset(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("username") ?? "").trim();
  if (!username) return { error: "Enter your username." };
  const done = { ok: "If that account exists, we've emailed a link to its email address. Check your inbox (and spam). Nothing arrived? Ask the Founder." };

  const user = await prisma.user.findUnique({ where: { email: toEmail(username) } });
  if (!user?.active) return done;
  const who = { name: user.name, username: usernameOf(user.email) };
  try {
    if (!user.passwordHash && user.contactEmail) {
      if ((await recentLinks(user.id, "INVITE")) < 3) await sendLinkEmail("INVITE", user.contactEmail, await createLink(user.id, "INVITE", user.contactEmail), who);
    } else if (user.joinedViaId && !user.emailVerifiedAt && user.contactEmail) {
      // Signed up with a team invitation but never verified: send the verification link again.
      if ((await recentLinks(user.id, "VERIFY_EMAIL")) < 3) await sendLinkEmail("VERIFY_EMAIL", user.contactEmail, await createLink(user.id, "VERIFY_EMAIL", user.contactEmail), who);
    } else if (user.contactEmail && user.emailVerifiedAt) {
      if ((await recentLinks(user.id, "RESET")) < 3) await sendLinkEmail("RESET", user.contactEmail, await createLink(user.id, "RESET", user.contactEmail), who);
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { resetRequestedAt: new Date() } });
    }
  } catch (e) {
    console.error("[mail] reset email failed", e);
    await prisma.user.update({ where: { id: user.id }, data: { resetRequestedAt: new Date() } });
  }
  return done;
}

/** Invite link: confirms the email address and sets the first password. */
export async function acceptInvite(token: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const bad = checkNewPassword(fd);
  if (bad) return { error: bad };
  const found = await findLink(token, "INVITE");
  if (found.status !== "ok") return { error: "This invite link is no longer valid. Ask the Founder to send a new one." };
  const t = found.token;
  const clash = await prisma.user.findFirst({ where: { contactEmail: t.email, id: { not: t.userId } } });
  if (clash) return { error: "This email address is already used by another account. Ask the Founder for help." };
  if (!(await consumeLink(t.id))) return { error: "This invite link has already been used." };

  const user = await prisma.user.update({
    where: { id: t.userId },
    data: {
      passwordHash: await bcrypt.hash(String(fd.get("password")), 10),
      contactEmail: t.email,
      emailVerifiedAt: new Date(),
      pendingEmail: null,
      resetRequestedAt: null,
      sessionVersion: { increment: 1 },
    },
  });
  await startSession(user.id, user.sessionVersion);
  redirect("/");
}

/** Password-reset link: sets a new password and signs out every other device. */
export async function resetPassword(token: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const bad = checkNewPassword(fd);
  if (bad) return { error: bad };
  const found = await findLink(token, "RESET");
  if (found.status !== "ok") return { error: "This reset link is no longer valid. Ask for a new one from the Forgot password page." };
  if (!(await consumeLink(found.token.id))) return { error: "This reset link has already been used." };

  const user = await prisma.user.update({
    where: { id: found.token.userId },
    data: { passwordHash: await bcrypt.hash(String(fd.get("password")), 10), resetRequestedAt: null, sessionVersion: { increment: 1 } },
  });
  await startSession(user.id, user.sessionVersion);
  redirect("/");
}

/** Change-of-email link: the new address replaces the old one once confirmed. */
export async function confirmEmail(token: string): Promise<ActionResult> {
  const found = await findLink(token, "VERIFY_EMAIL");
  if (found.status !== "ok") return { error: "This confirmation link is no longer valid. Request a new one from your profile." };
  const t = found.token;
  const clash = await prisma.user.findFirst({ where: { contactEmail: t.email, id: { not: t.userId } } });
  if (clash) return { error: "This email address is already used by another account." };
  if (!(await consumeLink(t.id))) return { error: "This confirmation link has already been used." };
  await prisma.user.update({
    where: { id: t.userId },
    data: { contactEmail: t.email, emailVerifiedAt: new Date(), pendingEmail: null },
  });
  return {
    ok: t.user.joinedViaId && !t.user.emailVerifiedAt
      ? "Email verified — your account is ready. You can now sign in with your username and password."
      : `Confirmed. ${t.email} is now the email for this account.`,
  };
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
