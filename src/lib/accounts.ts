// Account helpers: usernames on the organisation's email domain, and one-time setup codes
// that let a person choose their own password (first sign-in or after a reset).
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const EMAIL_DOMAIN = "projexahub.com";
export const SETUP_CODE_DAYS = 7;
export const MAX_SETUP_ATTEMPTS = 5;
export const MIN_PASSWORD = 8;

const USERNAME_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export function isValidUsername(u: string) {
  return u.length >= 2 && u.length <= 40 && USERNAME_RE.test(u);
}

/** "tobi.adeyemi" → "tobi.adeyemi@projexahub.com". A full email is accepted as typed. */
export function toEmail(input: string) {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${EMAIL_DOMAIN}`;
}

export function usernameOf(email: string) {
  return email.split("@")[0];
}

// No 0/O, 1/I/L so codes are easy to read out over the phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const normaliseCode = (c: string) => c.replace(/[^a-z0-9]/gi, "").toUpperCase();

/**
 * Issue a new one-time setup code for a user and return it in plain text (shown once to the Founder).
 * Clears the current password, so an old or forgotten password stops working immediately.
 */
export async function issueSetupCode(userId: string) {
  const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: null,
      setupCodeHash: await bcrypt.hash(raw, 10),
      setupCodeExpiresAt: new Date(Date.now() + SETUP_CODE_DAYS * 24 * 60 * 60 * 1000),
      setupCodeAttempts: 0,
    },
  });
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Checks a setup code. Wrong guesses count towards a limit, after which the code is cancelled. */
export async function checkSetupCode(
  user: { id: string; setupCodeHash: string | null; setupCodeExpiresAt: Date | null; setupCodeAttempts: number },
  code: string,
): Promise<"ok" | "invalid" | "expired"> {
  if (!user.setupCodeHash || !user.setupCodeExpiresAt) return "invalid";
  if (user.setupCodeExpiresAt < new Date() || user.setupCodeAttempts >= MAX_SETUP_ATTEMPTS) return "expired";
  if (await bcrypt.compare(normaliseCode(code), user.setupCodeHash)) return "ok";
  const attempts = user.setupCodeAttempts + 1;
  await prisma.user.update({
    where: { id: user.id },
    data: attempts >= MAX_SETUP_ATTEMPTS ? { setupCodeAttempts: attempts, setupCodeHash: null, setupCodeExpiresAt: null } : { setupCodeAttempts: attempts },
  });
  return attempts >= MAX_SETUP_ATTEMPTS ? "expired" : "invalid";
}
