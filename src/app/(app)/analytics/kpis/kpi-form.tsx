import type { Kpi, Team } from "@prisma/client";
import { weekOptions } from "@/lib/periods";
import { Field } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveKpi } from "../actions";

export function KpiForm({ kpi, teams, teamId, period }: { kpi?: Kpi; teams: Team[]; teamId: string; period: string }) {
  const weeks = weekOptions(12);
  if (!weeks.some((w) => w.value === period)) weeks.push({ value: period, label: period });
  return (
    <ActionForm action={saveKpi.bind(null, kpi?.id ?? null)} className="card max-w-2xl p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Department / team" htmlFor="teamId">
          <select id="teamId" name="teamId" defaultValue={kpi?.teamId ?? teamId} className="input">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Reporting week" htmlFor="period">
          <select id="period" name="period" defaultValue={kpi?.period ?? period} className="input">
            {weeks.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="KPI name" htmlFor="name">
        <input id="name" name="name" defaultValue={kpi?.name} required maxLength={200} className="input" placeholder="e.g. New social media followers" />
      </Field>
      <Field label="Description" htmlFor="description" hint="What the KPI measures.">
        <textarea id="description" name="description" defaultValue={kpi?.description} rows={2} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Target" htmlFor="target">
          <input id="target" name="target" type="number" step="any" min="0" defaultValue={kpi?.target} required className="input" />
        </Field>
        <Field label="Unit" htmlFor="unit" hint="e.g. posts, leads, ₦, %">
          <input id="unit" name="unit" defaultValue={kpi?.unit} maxLength={40} className="input" />
        </Field>
        <Field label="Actual result" htmlFor="actual" hint="Leave blank until known.">
          <input id="actual" name="actual" type="number" step="any" min="0" defaultValue={kpi?.actual ?? ""} className="input" />
        </Field>
      </div>
      <Field label="Remarks" htmlFor="remarks">
        <textarea id="remarks" name="remarks" defaultValue={kpi?.remarks} rows={2} className="input" />
      </Field>
      <p className="text-xs text-muted">Achievement % and status are calculated automatically from the target and actual result.</p>
      <SubmitButton>{kpi ? "Save changes" : "Add KPI"}</SubmitButton>
    </ActionForm>
  );
}
