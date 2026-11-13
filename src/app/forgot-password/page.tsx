import type { Metadata } from "next";
import { requestPasswordReset } from "../auth-actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AuthLink, AuthShell, UsernameInput } from "@/components/auth";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      subtitle="Forgot password"
      footer={
        <>
          <AuthLink href="/login">Back to sign in</AuthLink>
        </>
      }
    >
      <div className="card p-6">
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Enter your username.</li>
          <li>We email a reset link to the address on your account.</li>
          <li>Open the link and choose a new password.</li>
        </ol>
        <ActionForm action={requestPasswordReset}>
          <UsernameInput autoFocus />
          <SubmitButton className="btn-primary w-full">Email me a reset link</SubmitButton>
        </ActionForm>
      </div>
    </AuthShell>
  );
}
