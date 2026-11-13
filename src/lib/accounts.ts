// Account helpers: usernames on the organisation's domain, and single-use email links
// (invite, password reset, email verification). Only a SHA-256 hash of each link token is stored.
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";

export const EMAIL_DOMAIN = "projexahub.com";
export const MIN_PASSWORD = 8;

export type TokenKind = "INVITE" | "RESET" | "VERIFY_EMAIL";
const HOUR = 60 * 60 * 1000;
export const TOKEN_TTL: Record<TokenKind, number> = { INVITE: 48 * HOUR, RESET: 1 * HOUR, VERIFY_EMAIL: 24 * HOUR };
export const TTL_LABEL: Record<TokenKind, string> = { INVITE: "2 days", RESET: "1 hour", VERIFY_EMAIL: "24 hours" };
const PATHS: Record<TokenKind, string> = { INVITE: "/invite", RESET: "/reset-password", VERIFY_EMAIL: "/verify-email" };

const USERNAME_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
export function isValidUsername(u: string) {
  return u.length >= 2 && u.length <= 40 && USERNAME_RE.test(u);
}
export const isValidEmail = (e: string) => e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const normaliseEmail = (e: string) => e.trim().toLowerCase();

/** "tobi.adeyemi" → "tobi.adeyemi@projexahub.com". A full sign-in email is accepted as typed. */
export function toEmail(input: string) {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${EMAIL_DOMAIN}`;
}
export function usernameOf(email: string) {
  return email.split("@")[0];
}

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Base URL for links in emails: APP_URL if set, otherwise the address this request came in on. */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
  } catch {
    // Not in a request (e.g. a script).
  }
  return "http://localhost:3000";
}

/**
 * Create a single-use link for a user. Any earlier unused link of the same kind stops working,
 * so only the most recent email is valid.
 */
export async function createLink(userId: string, kind: TokenKind, email: string, base?: string) {
  const raw = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.$transaction([
    prisma.authToken.updateMany({ where: { userId, kind, usedAt: null }, data: { usedAt: now } }),
    prisma.authToken.create({ data: { userId, kind, email, tokenHash: hash(raw), expiresAt: new Date(now.getTime() + TOKEN_TTL[kind]) } }),
  ]);
  return `${base ?? (await appUrl())}${PATHS[kind]}?token=${raw}`;
}

/** Look up a link without using it up (to show the right page). */
export async function findLink(raw: string | undefined, kind: TokenKind) {
  if (!raw || raw.length < 20) return { status: "invalid" as const };
  const t = await prisma.authToken.findUnique({ where: { tokenHash: hash(raw) }, include: { user: true } });
  if (!t || t.kind !== kind || !t.user.active) return { status: "invalid" as const };
  if (t.usedAt) return { status: "used" as const };
  if (t.expiresAt < new Date()) return { status: "expired" as const };
  return { status: "ok" as const, token: t };
}

/** Mark a link as used. Returns false if someone used it in the meantime. */
export async function consumeLink(id: string) {
  const r = await prisma.authToken.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
  return r.count === 1;
}

/** How many links of this kind were sent to the user recently (to stop email floods). */
export async function recentLinks(userId: string, kind: TokenKind, withinMs = HOUR) {
  return prisma.authToken.count({ where: { userId, kind, createdAt: { gte: new Date(Date.now() - withinMs) } } });
}
