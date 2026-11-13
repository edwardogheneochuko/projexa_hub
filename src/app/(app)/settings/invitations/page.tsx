import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { formatDate } from "@/lib/periods";
import { usernameOf } from "@/lib/accounts";
import { INVITE_DAYS, INVITE_ROLES, inviteLink, inviteStatus } from "@/lib/invites";
import { Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { CopyField } from "@/components/copy-field";
import { createTeamInvite, revokeTeamInvite } from "../actions";

export const metadata: Metadata = { title: "Team invitations" };

const STATUS_BADGE = {
  ok: <Badge tone="good">Active</Badge>,
  expired: <Badge tone="neutral">Expired</Badge>,
  revoked: <Badge tone="neutral">Switched off</Badge>,
  full: <Badge tone="neutral">Used up</Badge>,
  invalid: null,
};

export default async function InvitationsPage() {
  await requireFounder();
  const [teams, invites] = await Promise.all([
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.teamInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { team: true, members: { select: { id: true, name: true, email: true, emailVerifiedAt: true }, orderBy: { createdAt: "asc" } } },
    }),
  ]);
  const links = await Promise.all(invites.map((i) => inviteLink(i.code)));

  return (
    <>
      <PageHeader
        title="Team invitations"
        description="Create a link for a department and role, and share it with your team (e.g. on WhatsApp). Each person signs up with their own name, username, email and password, then verifies their email to finish."
        crumbs={[{ href: "/settings", label: "Settings" }]}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
        <Card title="New invitation link">
          <ActionForm action={createTeamInvite}>
            <Field label="Department" htmlFor="teamId">
              <select id="teamId" name="teamId" defaultValue="" className="input">
                <option value="">Person chooses their department</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Role" htmlFor="role">
              <select id="role" name="role" defaultValue="MEMBER" className="input">
                {Object.entries(INVITE_ROLES).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Link valid for" htmlFor="days">
              <select id="days" name="days" defaultValue="7" className="input">
                {INVITE_DAYS.map((d) => (
                  <option key={d} value={d}>{d === 1 ? "1 day" : `${d} days`}</option>
                ))}
              </select>
            </Field>
            <Field label="Number of people (optional)" htmlFor="maxUses" hint="Leave empty to allow anyone with the link until it expires.">
              <input id="maxUses" name="maxUses" type="number" min={1} max={500} className="input" />
            </Field>
            <SubmitButton className="btn-primary w-full">Generate link</SubmitButton>
          </ActionForm>
          <p className="mt-4 text-xs text-muted">
            Anyone with an active link can sign up, so share it only with your team. People join as a Department Head or Team Member; you can change anyone&apos;s role or department later in Settings.
          </p>
        </Card>

        <div className="space-y-4">
          {invites.length === 0 && <EmptyState>No invitation links yet. Create one to bring your team in.</EmptyState>}
          {invites.map((inv, i) => {
            const status = inviteStatus(inv);
            return (
              <Card key={inv.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {inv.team?.name ?? "Any department"} · {INVITE_ROLES[inv.role] ?? inv.role}
                  </p>
                  {STATUS_BADGE[status]}
                </div>
                {status === "ok" && <CopyField value={links[i]} label={`Invitation link for ${inv.team?.name ?? "any department"}`} />}
                <p className="mt-2 text-xs text-muted">
                  Created {formatDate(inv.createdAt)} · {inv.expiresAt > new Date() ? "expires" : "expired"} {formatDate(inv.expiresAt)} · used by {inv.uses}
                  {inv.maxUses !== null ? ` of ${inv.maxUses}` : ""} {inv.uses === 1 && inv.maxUses === null ? "person" : "people"}
                </p>
                {inv.members.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                    {inv.members.map((m) => (
                      <li key={m.id}>
                        <Link href={`/settings/users/${m.id}`} className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 hover:bg-cream">
                          {m.name} <span className="text-muted">({usernameOf(m.email)})</span>
                          {m.emailVerifiedAt ? "" : <span className="text-amber-700">· not verified yet</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {status === "ok" && (
                  <div className="mt-3">
                    <ConfirmButton action={revokeTeamInvite.bind(null, inv.id)} message="Switch off this link? Nobody new can join with it. People who already joined are not affected." className="btn-danger">
                      Switch off link
                    </ConfirmButton>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
