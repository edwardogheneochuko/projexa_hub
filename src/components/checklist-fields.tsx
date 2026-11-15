"use client";

import { useState } from "react";
import { METHODS, itemScore, overallScore, performanceStatus } from "@/lib/checklist-score";

export type FieldItem = { id: string; title: string; description: string; method: string; target: number | null; unit: string; weight: number };

/** The weekly checklist inside the report form, with a live score preview (the server recalculates it). */
export function ChecklistFields({ items, benchmark, initial }: { items: FieldItem[]; benchmark: number; initial: Record<string, { value: number; note: string }> }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, initial[i.id] ? String(initial[i.id].value) : ""])),
  );
  const scored = items.flatMap((i) => {
    const v = values[i.id] === "" ? null : Number(values[i.id]);
    const s = itemScore(i, v);
    return s === null ? [] : [{ score: s, weight: i.weight }];
  });
  const answered = scored.length;
  const score = answered === items.length ? overallScore(scored) : null;
  const status = performanceStatus(score, benchmark);
  const set = (id: string, v: string) => setValues((x) => ({ ...x, [id]: v }));

  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold">Weekly checklist</legend>
      <ol className="space-y-3">
        {items.map((i, n) => (
          <li key={i.id} className="rounded-lg bg-cream/60 p-3">
            <p className="text-sm font-medium">
              {n + 1}. {i.title}
            </p>
            {i.description && <p className="text-xs text-muted">{i.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {i.method === "YESNO" && (
                <>
                  {[["1", "Done"], ["0", "Not done"]].map(([v, l]) => (
                    <label key={v} className="inline-flex items-center gap-1.5">
                      <input type="radio" name={`ans_${i.id}`} value={v} checked={values[i.id] === v} onChange={() => set(i.id, v)} required className="h-4 w-4" /> {l}
                    </label>
                  ))}
                </>
              )}
              {i.method === "TARGET" && (
                <label className="inline-flex items-center gap-2">
                  Actual
                  <input
                    type="number"
                    name={`ans_${i.id}`}
                    min={0}
                    step="any"
                    required
                    value={values[i.id]}
                    onChange={(e) => set(i.id, e.target.value)}
                    className="input w-28"
                  />
                  <span className="text-muted">of {i.target} {i.unit}</span>
                </label>
              )}
              {i.method === "SCALE" && (
                <span className="inline-flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <label key={r} className="inline-flex items-center gap-1">
                      <input type="radio" name={`ans_${i.id}`} value={r} checked={values[i.id] === String(r)} onChange={() => set(i.id, String(r))} required className="h-4 w-4" /> {r}
                    </label>
                  ))}
                  <span className="text-xs text-muted">(1 = poor, 5 = excellent)</span>
                </span>
              )}
              <span className="ml-auto text-xs text-muted">{METHODS[i.method as keyof typeof METHODS]?.label}</span>
            </div>
            <input name={`note_${i.id}`} defaultValue={initial[i.id]?.note ?? ""} maxLength={300} placeholder="Note (optional)" className="input mt-2 text-xs" />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm" aria-live="polite">
        <span>
          Score: <strong>{score === null ? `answer all ${items.length} items` : `${Math.round(score)}%`}</strong> · benchmark {benchmark}%
        </span>
        {status && <span className={status === "On Track" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{status}</span>}
      </div>
    </fieldset>
  );
}
