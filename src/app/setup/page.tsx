import type { Metadata } from "next";
import { completeSetup } from "../auth-actions";
import { MIN_PASSWORD } from "@/lib/accounts";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AuthLink, AuthShell, UsernameInput } from "@/components/auth";

export const metadata: Metadata = { title: "Set your password" };

export default function SetupPage() {
  return (
    <AuthShell subtitle="Set your password" footer={<AuthLink href="/login">Back to sign in</AuthLink>}>
      <div className="card p-6">
        <p className="mb-4 text-sm text-muted">
          Use this the first time you sign in, or after a password reset. Enter the <strong>setup code</strong> the Founder gave you, then choose your own password.
        </p>
        <ActionForm action={completeSetup}>
          <UsernameInput autoFocus />
          <div>
            <label className="label" htmlFor="code">Setup code</label>
            <input
              id="code"
              name="code"
              required
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABCD-EFGH"
              className="input font-mono uppercase tracking-widest"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className="input" />
            <p className="mt-1 text-xs text-muted">At least {MIN_PASSWORD} characters.</p>
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className="input" />
          </div>
          <SubmitButton className="btn-primary w-full">Set password and sign in</SubmitButton>
        </ActionForm>
      </div>
    </AuthShell>
  );
}
