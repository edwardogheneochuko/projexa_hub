import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MIN_PASSWORD } from "@/lib/accounts";
import { INVITE_ROLES, STATUS_TEXT, findInvite } from "@/lib/invites";
import { ActionForm, SubmitButton } from "@/components/forms";
import { AuthLink, AuthShell, UsernameInput } from "@/components/auth";
import { joinTeam } from "../actions";

export const metadata: Metadata = { title: "Join Projexa Hub Central" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { status, invite } = await findInvite(code);
  const teams = invite && !invite.teamId ? await prisma.team.findMany({ orderBy: { sortOrder: "asc" } }) : [];

  return (
    <AuthShell subtitle="Create your account" footer={<AuthLink href="/login">Already have an account? Sign in</AuthLink>}>
      {status !== "ok" || !invite ? (
        <div className="card p-6 text-sm">
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">{STATUS_TEXT[status === "ok" ? "invalid" : status]}</p>
        </div>
      ) : (
        <div className="card p-6">
          <p className="mb-4 text-sm text-muted">
            You&apos;ve been invited to join Projexa Hub as a <strong className="text-ink">{INVITE_ROLES[invite.role] ?? "Team Member"}</strong>
            {invite.team && <> in <strong className="text-ink">{invite.team.name}</strong></>}. After signing up, we&apos;ll email you a link to verify your email.
          </p>
          <ActionForm action={joinTeam.bind(null, code)}>
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" name="name" autoComplete="name" required className="input" />
            </div>
            <UsernameInput />
            <p className="-mt-2 text-xs text-muted">You&apos;ll sign in with this. Lowercase letters, numbers and . _ -</p>
            <div>
              <label className="label" htmlFor="teamId">Department</label>
              {invite.team ? (
                <input id="teamId" value={invite.team.name} readOnly className="input bg-cream text-muted" />
              ) : (
                <select id="teamId" name="teamId" required defaultValue="" className="input">
                  <option value="" disabled>Choose your department</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="label" htmlFor="contactEmail">Email address</label>
              <input id="contactEmail" name="contactEmail" type="email" autoComplete="email" required placeholder="name@gmail.com" className="input" />
              <p className="mt-1 text-xs text-muted">Your real inbox. We&apos;ll send a verification link here, and password resets later.</p>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className="input" />
              <p className="mt-1 text-xs text-muted">At least {MIN_PASSWORD} characters.</p>
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} required className="input" />
            </div>
            <SubmitButton className="btn-primary w-full">Create account</SubmitButton>
          </ActionForm>
        </div>
      )}
    </AuthShell>
  );
}
