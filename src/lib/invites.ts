// Team invitation links (Settings → Team invitations). The Founder chooses a department (or lets the
// person choose) and a role; anyone with the link can sign up, and the account works once their email is verified.
import { randomBytes } from "node:crypto";
import type { TeamInvite } from "@prisma/client";
import { prisma } from "./db";
import { appUrl } from "./accounts";

export const INVITE_ROLES: Record<string, string> = { MEMBER: "Team Member", HEAD: "Department Head" };
export const INVITE_DAYS = [1, 7, 30];

export const inviteLink = async (code: string) => `${await appUrl()}/join/${code}`;
export const newInviteCode = () => randomBytes(18).toString("base64url");

export type InviteStatus = "ok" | "invalid" | "expired" | "revoked" | "full";

export function inviteStatus(i: Pick<TeamInvite, "expiresAt" | "revokedAt" | "maxUses" | "uses"> | null): InviteStatus {
  if (!i) return "invalid";
  if (i.revokedAt) return "revoked";
  if (i.expiresAt < new Date()) return "expired";
  if (i.maxUses !== null && i.uses >= i.maxUses) return "full";
  return "ok";
}

export async function findInvite(code: string | undefined) {
  if (!code || code.length < 16) return { status: "invalid" as const, invite: null };
  const invite = await prisma.teamInvite.findUnique({ where: { code }, include: { team: true } });
  return { status: inviteStatus(invite), invite };
}

export const STATUS_TEXT: Record<Exclude<InviteStatus, "ok">, string> = {
  invalid: "This invitation link isn't valid. Check you copied the whole link.",
  expired: "This invitation link has expired. Ask the Founder for a new one.",
  revoked: "This invitation link has been switched off. Ask the Founder for a new one.",
  full: "This invitation link has already been used the maximum number of times. Ask the Founder for a new one.",
};
