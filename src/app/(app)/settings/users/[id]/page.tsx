import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { formatDate } from "@/lib/periods";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { UserForm } from "../user-form";
import { resendInvite, sendPasswordReset } from "../../actions";

export const metadata = { title: "Edit person" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFounder();
  const { id } = await params;
  const [user, teams] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!user) notFound();
  const invite = !user.passwordHash
    ? await prisma.authToken.findFirst({ where: { userId: user.id, kind: "INVITE" }, orderBy: { createdAt: "desc" } })
    : null;
  const inviteOpen = invite && !invite.usedAt && invite.expiresAt > new Date();

  return (
    <>
      <PageHeader title={`Edit ${user.name}`} crumbs={[{ href: "/settings", label: "Settings" }]} />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <UserForm user={user} teams={teams} />
        <Card title="Sign-in & email">
          <div className="space-y-3 text-sm">
            <p>
              Account:{" "}
              {user.passwordHash ? <Badge tone="good">Set up</Badge> : inviteOpen ? <Badge tone="warn">Invite sent</Badge> : <Badge tone="bad">Invite expired / not sent</Badge>}
            </p>
            <p>
              Email:{" "}
              {user.contactEmail ? (
                <>
                  <span className="break-all">{user.contactEmail}</span>{" "}
                  {user.emailVerifiedAt ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Not verified yet</Badge>}
                </>
              ) : (
                <span className="text-muted">None — add one in the form to send an invite.</span>
              )}
            </p>
            {user.pendingEmail && <p className="text-muted">Waiting for confirmation of {user.pendingEmail}.</p>}
            {invite && !user.passwordHash && <p className="text-muted">Last invite sent {formatDate(invite.createdAt)}{inviteOpen ? `, valid until ${formatDate(invite.expiresAt)}` : ""}.</p>}
            {user.resetRequestedAt && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Asked for a password reset on {formatDate(user.resetRequestedAt)}, but has no verified email. Add or fix their email, then send a reset.
              </p>
            )}
            {!user.passwordHash && user.contactEmail && (
              <ActionForm action={resendInvite.bind(null, user.id)}>
                <SubmitButton className="btn-secondary w-full">Resend invite email</SubmitButton>
              </ActionForm>
            )}
            {user.passwordHash && user.emailVerifiedAt && (
              <ActionForm action={sendPasswordReset.bind(null, user.id)}>
                <p className="text-muted">Emails them a link to choose a new password. Their current password works until they use it.</p>
                <SubmitButton className="btn-secondary w-full">Send password-reset email</SubmitButton>
              </ActionForm>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
