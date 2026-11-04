import Link from "next/link";
import { EMAIL_DOMAIN } from "@/lib/accounts";

/** Frame shared by the public sign-in, setup and forgot-password pages. */
export function AuthShell({ subtitle, children, footer }: { subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand text-base font-bold text-white">PH</span>
          <h1 className="text-2xl font-bold text-brand">Projexa Hub Central</h1>
          <p className="mt-1 text-sm text-muted">{subtitle ?? "Ideas. People. Projects."}</p>
        </div>
        {children}
        {footer && <div className="mt-4 space-y-1 text-center text-sm">{footer}</div>}
      </div>
    </main>
  );
}

/** Username box with the organisation's email domain shown after it. Full emails also work. */
export function UsernameInput({ autoFocus }: { autoFocus?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor="username">Username</label>
      <div className="flex items-stretch">
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus={autoFocus}
          placeholder="e.g. tobi.adeyemi"
          className="input min-w-0 rounded-r-none"
        />
        <span className="inline-flex items-center rounded-r-lg border border-l-0 border-line bg-cream px-2 text-xs text-muted">@{EMAIL_DOMAIN}</span>
      </div>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p>
      <Link href={href} className="link">{children}</Link>
    </p>
  );
}
