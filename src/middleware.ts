import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, signSession, verifySession } from "@/lib/session";

// Coarse gate: unauthenticated visitors are sent to /login. Fine-grained role checks
// happen in each page and server action.
export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = req.nextUrl.pathname === "/login";

  if (!session) {
    if (isLogin) return NextResponse.next();
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE); // drop an expired token
    return res;
  }

  // The sign-in page is always shown (it offers to continue or switch account), so a
  // shared computer never silently continues as the previous person.
  const res = NextResponse.next();
  // Sliding idle timeout: activity keeps the sign-in alive; 30 idle minutes end it.
  if (session.needsRefresh && !isLogin) {
    res.cookies.set(SESSION_COOKIE, await signSession(session.userId), SESSION_COOKIE_OPTIONS);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
