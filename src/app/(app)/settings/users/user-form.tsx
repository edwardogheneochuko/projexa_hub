import type { Team, User } from "@prisma/client";
import { ROLE_LABELS } from "@/lib/permissions";
import { Field } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveUser } from "../actions";

export function UserForm({ user, teams }: { user?: User; teams: Team[] }) {
  return (
    <ActionForm action={saveUser.bind(null, user?.id ?? null)} className="card max-w-2xl p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name">
          <input id="name" name="name" defaultValue={user?.name} required className="input" />
        </Field>
        <Field label="Work email" htmlFor="email">
          <input id="email" name="email" type="email" defaultValue={user?.email} required className="input" />
        </Field>
        <Field label="Role" htmlFor="role">
          <select id="role" name="role" defaultValue={user?.role ?? "MEMBER"} className="input">
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Department / team" htmlFor="teamId">
          <select id="teamId" name="teamId" defaultValue={user?.teamId ?? ""} className="input">
            <option value="">None (Founder only)</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Position" htmlFor="position" hint="e.g. Social Media Lead">
            <input id="position" name="position" defaultValue={user?.position} className="input" />
          </Field>
        </div>
      </div>

      <fieldset className="rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Confidential access</legend>
        <p className="mb-3 text-xs text-muted">The Founder always has access. Others need an explicit grant — belonging to Finance does not grant Finance access by itself.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canViewFinance" defaultChecked={user?.canViewFinance} className="h-4 w-4" /> Finance records
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="canViewHR" defaultChecked={user?.canViewHR} className="h-4 w-4" /> HR & onboarding records
        </label>
      </fieldset>

      <Field label={user ? "Reset password" : "Temporary password"} htmlFor="password" hint={user ? "Leave blank to keep the current password." : "At least 8 characters. Ask them to change it after signing in."}>
        <input id="password" name="password" type="text" autoComplete="new-password" minLength={8} required={!user} className="input font-mono" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={user?.active ?? true} className="h-4 w-4" /> Account active (inactive accounts can&apos;t sign in; their history is kept)
      </label>
      <SubmitButton>{user ? "Save changes" : "Create account"}</SubmitButton>
    </ActionForm>
  );
}
