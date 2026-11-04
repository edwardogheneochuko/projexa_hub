import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { formatDate } from "@/lib/periods";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { UserForm } from "../user-form";
import { resetUserPassword } from "../../actions";

export const metadata = { title: "Edit person" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFounder();
  const { id } = await params;
  const [user, teams] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!user) notFound();

  const codePending = !!user.setupCodeHash && !!user.setupCodeExpiresAt && user.setupCodeExpiresAt > new Date();

  return (
    <>
      <PageHeader title={`Edit ${user.name}`} crumbs={[{ href: "/settings", label: "Settings" }]} />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <UserForm user={user} teams={teams} />
        <Card title="Sign-in & password">
          <div className="space-y-3 text-sm">
            <p>
              Status:{" "}
              {user.passwordHash ? (
                <Badge tone="good">Password set</Badge>
              ) : codePending ? (
                <Badge tone="warn">Waiting for setup</Badge>
              ) : (
                <Badge tone="bad">No password — needs a new code</Badge>
              )}
            </p>
            {codePending && <p className="text-muted">Setup code expires {formatDate(user.setupCodeExpiresAt!)}.</p>}
            {user.resetRequestedAt && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Asked for a password reset on {formatDate(user.resetRequestedAt)}.
              </p>
            )}
            <p className="text-muted">
              Resetting creates a new one-time setup code for you to give them. Their current password stops working straight away.
            </p>
            <ActionForm action={resetUserPassword.bind(null, user.id)}>
              <SubmitButton className="btn-secondary w-full">{user.passwordHash ? "Reset password" : "Create new setup code"}</SubmitButton>
            </ActionForm>
          </div>
        </Card>
      </div>
    </>
  );
}
