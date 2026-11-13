import type { Metadata } from "next";
import { confirmEmail } from "../auth-actions";
import { findLink, usernameOf } from "@/lib/accounts";
import { sp, type SearchParams } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AuthLink, AuthShell } from "@/components/auth";
import { LinkProblem } from "@/components/link-page";

export const metadata: Metadata = { title: "Confirm email" };

// Confirming needs a button press (not just opening the link), so email scanners
// that open links automatically can't confirm an address by accident.
export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const token = sp(await searchParams, "token");
  const found = await findLink(token, "VERIFY_EMAIL");
  return (
    <AuthShell subtitle="Confirm your email" footer={<AuthLink href="/">Go to Projexa Hub Central</AuthLink>}>
      {found.status !== "ok" ? (
        <LinkProblem status={found.status} what="confirmation" retry={{ href: "/profile", label: "Request a new link from My profile" }} />
      ) : (
        <div className="card p-6">
          <p className="mb-4 text-sm text-muted">
            Use <strong className="text-ink">{found.token.email}</strong> as the email for <strong className="text-ink">{usernameOf(found.token.user.email)}</strong>? Password-reset links will be sent there.
          </p>
          <ActionForm action={confirmEmail.bind(null, token)}>
            <SubmitButton className="btn-primary w-full">Confirm this email</SubmitButton>
          </ActionForm>
        </div>
      )}
    </AuthShell>
  );
}
