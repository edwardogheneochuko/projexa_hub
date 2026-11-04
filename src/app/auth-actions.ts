"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/session";
import { MIN_PASSWORD, checkSetupCode, toEmail } from "@/lib/accounts";
import type { ActionResult } from "@/lib/utils";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

async function startSession(userId: string) {
  // Replaces any existing sign-in in this browser, so switching account is just signing in again.
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), SESSION_COOKIE_OPTIONS);
}

export async function login(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("username") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (!username || !password) return { error: "Enter your username and password." };

  const user = await prisma.user.findUnique({ where: { email: toEmail(username) } });
  // Compare against a dummy hash when there's no password to keep timing similar.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !ok || !user.active) {
    return { error: "Incorrect username or password. First time here? Use your setup code below." };
  }

  await startSession(user.id);
  redirect("/");
}

/** First sign-in or password reset: username + one-time setup code from the Founder + chosen password. */
export async function completeSetup(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("username") ?? "").trim();
  const code = String(fd.get("code") ?? "");
  const password = String(fd.get("password") ?? "");
  if (!username || !code) return { error: "Enter your username and the setup code from the Founder." };
  if (password.length < MIN_PASSWORD) return { error: `Choose a password of at least ${MIN_PASSWORD} characters.` };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The two passwords don't match." };

  const user = await prisma.user.findUnique({ where: { email: toEmail(username) } });
  if (!user || !user.active) {
    await bcrypt.compare(code, DUMMY_HASH);
    return { error: "That username and setup code don't match. Check both, or ask the Founder for a new code." };
  }
  const result = await checkSetupCode(user, code);
  if (result === "expired") return { error: "This setup code has expired or was entered wrongly too many times. Ask the Founder for a new one." };
  if (result !== "ok") return { error: "That username and setup code don't match. Check both, or ask the Founder for a new code." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      setupCodeHash: null,
      setupCodeExpiresAt: null,
      setupCodeAttempts: 0,
      resetRequestedAt: null,
    },
  });
  await startSession(user.id);
  redirect("/");
}

/** Forgot password: flags the account so the Founder sees the request in Settings. */
export async function requestPasswordReset(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const username = String(fd.get("username") ?? "").trim();
  if (!username) return { error: "Enter your username." };
  const user = await prisma.user.findUnique({ where: { email: toEmail(username) } });
  if (user?.active) await prisma.user.update({ where: { id: user.id }, data: { resetRequestedAt: new Date() } });
  // Same answer whether or not the account exists, so this can't be used to discover usernames.
  return { ok: "Request sent. The Founder will give you a setup code — then choose “First time here? / Reset password” on the sign-in page." };
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
