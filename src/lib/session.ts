// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "phc_session";
/** Sign-ins expire after this many seconds without activity. Each request slides the window forward. */
export const SESSION_IDLE_SECONDS = 30 * 60;
/** Re-issue the token at most this often, so not every request re-signs it. */
const REFRESH_AFTER_SECONDS = 5 * 60;

/**
 * No `maxAge`/`expires`: this is a browser-session cookie, so closing the browser signs the person out.
 * Shared computers therefore always start at the sign-in page.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET must be set to a string of at least 16 characters.");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_IDLE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<{ userId: string; needsRefresh: boolean } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    const age = Math.floor(Date.now() / 1000) - (payload.iat ?? 0);
    return { userId: payload.sub, needsRefresh: age > REFRESH_AFTER_SECONDS };
  } catch {
    return null;
  }
}
