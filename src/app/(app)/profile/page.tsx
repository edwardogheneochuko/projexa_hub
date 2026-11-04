import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { Avatar, Card, Field, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { changePassword, updateProfile } from "./actions";

export const metadata: Metadata = { title: "My profile" };

export default async function MyProfilePage() {
  const u = await requireUser();
  return (
    <>
      <PageHeader
        title="My profile"
        description="How you appear in the team directory. Name, email, department and position are managed by the Founder."
        actions={<Link href={`/directory/${u.id}`} className="btn-secondary">View public profile</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="mb-5 flex items-center gap-4">
            <Avatar name={u.name} url={u.avatarUrl} size={64} />
            <div>
              <p className="font-semibold">{u.name}</p>
              <p className="text-sm text-muted">
                {[u.position, u.team?.name, ROLE_LABELS[u.role as Role]].filter(Boolean).join(" · ")}
              </p>
              <p className="text-sm text-muted">{u.email}</p>
            </div>
          </div>
          <ActionForm action={updateProfile}>
            <Field label="Profile picture link" htmlFor="avatarUrl" hint="A link to an image (e.g. from Google Drive set to public, or LinkedIn). Images are not uploaded.">
              <input id="avatarUrl" name="avatarUrl" type="url" defaultValue={u.avatarUrl} placeholder="https://" className="input" />
            </Field>
            <Field label="Short introduction" htmlFor="bio">
              <textarea id="bio" name="bio" rows={3} maxLength={600} defaultValue={u.bio} className="input" />
            </Field>
            <Field label="Professional information" htmlFor="professional" hint="Skills, experience, education, areas of expertise.">
              <textarea id="professional" name="professional" rows={4} defaultValue={u.professional} className="input" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Work phone" htmlFor="phone">
                <input id="phone" name="phone" type="tel" defaultValue={u.phone} className="input" />
              </Field>
              <Field label="LinkedIn" htmlFor="linkedin">
                <input id="linkedin" name="linkedin" type="url" defaultValue={u.linkedin} placeholder="https://linkedin.com/in/…" className="input" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="showContact" defaultChecked={u.showContact} className="h-4 w-4 accent-[var(--color-brand)]" />
              Show my work contact details in the directory
            </label>
            <SubmitButton>Save profile</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Change password" className="h-fit">
          <ActionForm action={changePassword}>
            <Field label="Current password" htmlFor="current">
              <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
            </Field>
            <Field label="New password" htmlFor="next" hint="At least 8 characters.">
              <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="input" />
            </Field>
            <Field label="Confirm new password" htmlFor="confirm">
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
            </Field>
            <SubmitButton>Change password</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
