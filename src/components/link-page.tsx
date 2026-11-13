import Link from "next/link";
import { MIN_PASSWORD } from "@/lib/accounts";
import { SubmitButton } from "@/components/forms";

/** Shown when an emailed link is used, expired or wrong. */
export function LinkProblem({ status, what, retry }: { status: "invalid" | "used" | "expired"; what: string; retry: { href: string; label: string } }) {
  const msg =
    status === "used"
      ? `This ${what} link has already been used. Each link works once.`
      : status === "expired"
        ? `This ${what} link has expired.`
        : `This ${what} link isn't valid. Make sure you opened the newest email and copied the whole link.`;
  return (
    <div className="card p-6 text-sm">
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">{msg}</p>
      <p className="mt-4">
        <Link href={retry.href} className="link">{retry.label}</Link>
      </p>
    </div>
  );
}

/** New password + confirmation, used on the invite and reset pages. */
export function NewPasswordFields({ submit }: { submit: string }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className="input" />
        <p className="mt-1 text-xs text-muted">At least {MIN_PASSWORD} characters.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className="input" />
      </div>
      <SubmitButton className="btn-primary w-full">{submit}</SubmitButton>
    </>
  );
}
