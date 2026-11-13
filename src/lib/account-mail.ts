// Account emails shared by Settings (Founder) and My profile.
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { createLink, usernameOf } from "./accounts";
import { sendLinkEmail } from "./mail";

const who = (u: User) => ({ name: u.name, username: usernameOf(u.email) });

/** Email the person an invite link: confirms their email and lets them choose their first password. */
export async function sendInvite(u: User) {
  if (!u.contactEmail) throw new Error("This person has no email address yet.");
  await sendLinkEmail("INVITE", u.contactEmail, await createLink(u.id, "INVITE", u.contactEmail), who(u));
}

/** Email a password-reset link to the person's verified email. */
export async function sendReset(u: User) {
  if (!u.contactEmail || !u.emailVerifiedAt) throw new Error("This person has no verified email address.");
  await sendLinkEmail("RESET", u.contactEmail, await createLink(u.id, "RESET", u.contactEmail), who(u));
}

/**
 * Change someone's email. Before they have accepted their invite, the address is simply replaced and the
 * invite re-sent there. Afterwards, the new address must be confirmed by link; the old one stays in use until then.
 */
export async function changeEmail(u: User, next: string): Promise<"invite-resent" | "verification-sent"> {
  if (!u.passwordHash) {
    const updated = await prisma.user.update({ where: { id: u.id }, data: { contactEmail: next, emailVerifiedAt: null, pendingEmail: null } });
    await sendInvite(updated);
    return "invite-resent";
  }
  await prisma.user.update({ where: { id: u.id }, data: { pendingEmail: next } });
  await sendLinkEmail("VERIFY_EMAIL", next, await createLink(u.id, "VERIFY_EMAIL", next), who(u));
  return "verification-sent";
}

/** Is this address free to use for this person? */
export async function emailTaken(email: string, exceptUserId?: string) {
  const u = await prisma.user.findFirst({ where: { contactEmail: email, ...(exceptUserId ? { id: { not: exceptUserId } } : {}) } });
  return !!u;
}

export const mailError = (e: unknown) => (e instanceof Error ? e.message : "The email couldn't be sent.");
