import type { Metadata } from "next";
import { acceptInvite } from "../auth-actions";
import { findLink, usernameOf } from "@/lib/accounts";
import { sp, type SearchParams } from "@/lib/utils";
import { ActionForm } from "@/components/forms";
import { AuthLink, AuthShell } from "@/components/auth";
import { LinkProblem, NewPasswordFields } from "@/components/link-page";

export const metadata: Metadata = { title: "Set your password" };

export default async function InvitePage({ searchParams }: { searchParams: SearchParams }) {
  const token = sp(await searchParams, "token");
  const found = await findLink(token, "INVITE");
  return (
    <AuthShell subtitle="Welcome to Projexa Hub Central" footer={<AuthLink href="/login">Back to sign in</AuthLink>}>
      {found.status !== "ok" ? (
        <LinkProblem status={found.status} what="invite" retry={{ href: "/forgot-password", label: "Send me a new invite (Forgot password)" }} />
      ) : (
        <div className="card p-6">
          <p className="mb-1 text-sm">Hello {found.token.user.name}.</p>
          <p className="mb-4 text-sm text-muted">
            Your username is <strong className="text-ink">{usernameOf(found.token.user.email)}</strong>. Choose a password to finish setting up your account. This also confirms{" "}
            <strong className="text-ink">{found.token.email}</strong> as your email.
          </p>
          <ActionForm action={acceptInvite.bind(null, token)}>
            <NewPasswordFields submit="Set password and sign in" />
          </ActionForm>
        </div>
      )}
    </AuthShell>
  );
}
