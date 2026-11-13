"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSafeUrl } from "@/lib/hq";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession } from "@/lib/session";
import { EMAIL_DOMAIN, isValidEmail, normaliseEmail, recentLinks } from "@/lib/accounts";
import { changeEmail, emailTaken, mailError } from "@/lib/account-mail";
import type { ActionResult } from "@/lib/utils";

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function updateProfile(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const avatarUrl = str(fd, "avatarUrl", 500);
  const linkedin = str(fd, "linkedin", 300);
  if (avatarUrl && !isSafeUrl(avatarUrl)) return { error: "Profile picture must be a full web link starting with https://" };
  if (linkedin && !isSafeUrl(linkedin)) return { error: "LinkedIn must be a full web link starting with https://" };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      bio: str(fd, "bio", 600),
      professional: str(fd, "professional"),
      phone: str(fd, "phone", 40),
      linkedin,
      avatarUrl,
      showContact: fd.get("showContact") === "on",
    },
  });
  revalidatePath("/", "layout");
  return { ok: "Profile updated." };
}

export async function changePassword(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== String(fd.get("confirm") ?? "")) return { error: "New passwords don't match." };
  if (!user.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Current password is incorrect." };
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), resetRequestedAt: null, sessionVersion: { increment: 1 } },
  });
  // Other devices are signed out; this browser stays signed in.
  (await cookies()).set(SESSION_COOKIE, await signSession(user.id, updated.sessionVersion), SESSION_COOKIE_OPTIONS);
  return { ok: "Password changed. You've been signed out on other devices." };
}

/** Change my email: a confirmation link goes to the new address; the old one stays in use until confirmed. */
export async function requestEmailChange(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const next = normaliseEmail(String(fd.get("email") ?? ""));
  if (!isValidEmail(next)) return { error: "Enter a valid email address, e.g. name@gmail.com." };
  if (next.endsWith(`@${EMAIL_DOMAIN}`)) return { error: `Use a real inbox (e.g. Gmail), not a @${EMAIL_DOMAIN} sign-in name.` };
  if (next === user.contactEmail && user.emailVerifiedAt) return { error: "That's already your email." };
  if (!user.passwordHash || !(await bcrypt.compare(String(fd.get("current") ?? ""), user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  if (await emailTaken(next, user.id)) return { error: "Another account already uses this email address." };
  if ((await recentLinks(user.id, "VERIFY_EMAIL")) >= 3) return { error: "Too many requests. Try again in an hour." };
  try {
    await changeEmail(user, next);
  } catch (e) {
    return { error: mailError(e) };
  }
  revalidatePath("/profile");
  return { ok: `We sent a confirmation link to ${next}. Open it to finish the change${user.contactEmail ? `; until then ${user.contactEmail} stays in use` : ""}.` };
}
