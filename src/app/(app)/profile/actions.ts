"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isSafeUrl } from "@/lib/hq";
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
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10), resetRequestedAt: null } });
  return { ok: "Password changed." };
}
