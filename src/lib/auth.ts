import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "./db";
import { SESSION_COOKIE, verifySession } from "./session";

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { team: true },
  });
  // Signed out by a password reset/change elsewhere, or deactivated.
  if (!user || !user.active || user.sessionVersion !== session.sv) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireFounder(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "FOUNDER") notFound();
  return user;
}
