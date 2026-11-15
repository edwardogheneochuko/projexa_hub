// Slows down password guessing (PRD §7.3 "secure user authentication").
// A username is paused after 5 wrong passwords in 15 minutes; one internet connection after 20.
// "Forgot password?" still works while paused, so the real person is never locked out.
import { headers } from "next/headers";
import { prisma } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const PER_USER = 5;
const PER_IP = 20;

async function clientIp() {
  try {
    const h = await headers();
    return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  } catch {
    return "unknown";
  }
}

const keys = async (email: string) => ({ user: `user:${email}`, ip: `ip:${await clientIp()}` });

/** True when this username or connection has had too many recent failures. */
export async function isLoginBlocked(email: string) {
  const k = await keys(email);
  const since = new Date(Date.now() - WINDOW_MS);
  const [byUser, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { key: k.user, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { key: k.ip, createdAt: { gte: since } } }),
  ]);
  return byUser >= PER_USER || byIp >= PER_IP;
}

export async function recordLoginFailure(email: string) {
  const k = await keys(email);
  await prisma.loginAttempt.createMany({ data: [{ key: k.user }, { key: k.ip }] });
  // Housekeeping: nothing older than a day is ever needed.
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
}

/** A successful sign-in clears that username's failures (the connection's count is left to expire). */
export async function clearLoginFailures(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { key: `user:${email}` } });
}

export const LOGIN_BLOCKED_MESSAGE = "Too many sign-in attempts. Wait 15 minutes and try again, or use “Forgot password?” to reset it now.";
