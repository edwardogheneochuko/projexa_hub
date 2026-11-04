import type { Metadata } from "next";
import Link from "next/link";
import { login, logout } from "../auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // The form is always shown. If this browser is still signed in, say who, so the next
  // person on a shared computer can sign in as themselves instead of continuing.
  const current = await getCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-base font-bold text-white">PH</span>
          <h1 className="text-2xl font-bold text-brand">Projexa Hub Central</h1>
          <p className="mt-1 text-sm text-muted">Ideas. People. Projects.</p>
        </div>

        {current && (
          <div className="card mb-4 p-4 text-sm">
            <p>
              This browser is signed in as <span className="font-semibold">{current.name}</span>.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/" className="btn-secondary flex-1">Continue as {current.name.split(" ")[0]}</Link>
              <form action={logout} className="flex-1">
                <button className="btn-secondary w-full">Sign out</button>
              </form>
            </div>
            <p className="mt-3 text-xs text-muted">Not you? Sign in with your own account below.</p>
          </div>
        )}

        <div className="card p-6">
          <ActionForm action={login}>
            <div>
              <label className="label" htmlFor="email">Work email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
            </div>
            <SubmitButton className="btn-primary w-full">Sign in</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
