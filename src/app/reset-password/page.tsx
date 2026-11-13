import type { Metadata } from "next";
import { resetPassword } from "../auth-actions";
import { findLink, usernameOf } from "@/lib/accounts";
import { sp, type SearchParams } from "@/lib/utils";
import { ActionForm } from "@/components/forms";
import { AuthLink, AuthShell } from "@/components/auth";
import { LinkProblem, NewPasswordFields } from "@/components/link-page";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const token = sp(await searchParams, "token");
  const found = await findLink(token, "RESET");
  return (
    <AuthShell subtitle="Reset password" footer={<AuthLink href="/login">Back to sign in</AuthLink>}>
      {found.status !== "ok" ? (
        <LinkProblem status={found.status} what="reset" retry={{ href: "/forgot-password", label: "Send me a new reset link" }} />
      ) : (
        <div className="card p-6">
          <p className="mb-4 text-sm text-muted">
            Choose a new password for <strong className="text-ink">{usernameOf(found.token.user.email)}</strong>. You&apos;ll be signed out on other devices.
          </p>
          <ActionForm action={resetPassword.bind(null, token)}>
            <NewPasswordFields submit="Save new password and sign in" />
          </ActionForm>
        </div>
      )}
    </AuthShell>
  );
}
