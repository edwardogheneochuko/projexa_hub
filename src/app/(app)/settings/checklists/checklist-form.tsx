import type { Checklist, Team } from "@prisma/client";
import { INVITE_ROLES } from "@/lib/invites";
import { Field } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveChecklist } from "./actions";

/** Name, who the checklist applies to, and its benchmark. */
export function ChecklistForm({ checklist, teams }: { checklist?: Checklist; teams: Team[] }) {
  return (
    <ActionForm action={saveChecklist.bind(null, checklist?.id ?? null)}>
      <Field label="Name" htmlFor="name">
        <input id="name" name="name" defaultValue={checklist?.name} required placeholder="e.g. Marketing weekly checklist" className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department" htmlFor="teamId">
          <select id="teamId" name="teamId" defaultValue={checklist?.teamId ?? ""} className="input">
            <option value="">Every department</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Role" htmlFor="role">
          <select id="role" name="role" defaultValue={checklist?.role ?? ""} className="input">
            <option value="">Every role</option>
            {Object.entries(INVITE_ROLES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Benchmark (%)" htmlFor="benchmark" hint="Weekly score expected. At or above it = On Track; below = Needs Improvement.">
        <input id="benchmark" name="benchmark" type="number" min={1} max={100} defaultValue={checklist?.benchmark ?? 80} required className="input w-32" />
      </Field>
      {checklist && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={checklist.active} className="h-4 w-4" /> Active (inactive checklists aren&apos;t shown to anyone)
        </label>
      )}
      <SubmitButton>{checklist ? "Save" : "Create checklist"}</SubmitButton>
    </ActionForm>
  );
}
