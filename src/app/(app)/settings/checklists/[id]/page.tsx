import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ChecklistItem } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { MAX_ITEMS, METHODS } from "@/lib/checklist-score";
import { Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { ChecklistForm } from "../checklist-form";
import { deleteChecklist, deleteItem, moveItem, saveItem } from "../actions";

export const metadata: Metadata = { title: "Edit checklist" };

/** The fields for one item: expectation, how it's measured, scoring method, target, weight. */
function ItemFields({ item }: { item?: ChecklistItem }) {
  return (
    <>
      <Field label="Expectation" htmlFor={`title-${item?.id ?? "new"}`}>
        <input id={`title-${item?.id ?? "new"}`} name="title" defaultValue={item?.title} required placeholder="e.g. Publish weekly social media posts" className="input" />
      </Field>
      <Field label="How it's measured (optional)" htmlFor={`desc-${item?.id ?? "new"}`}>
        <input id={`desc-${item?.id ?? "new"}`} name="description" defaultValue={item?.description} placeholder="e.g. Posts live on Instagram and LinkedIn" className="input" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_110px_90px]">
        <Field label="Scoring" htmlFor={`method-${item?.id ?? "new"}`}>
          <select id={`method-${item?.id ?? "new"}`} name="method" defaultValue={item?.method ?? "YESNO"} className="input">
            {Object.entries(METHODS).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Target" htmlFor={`target-${item?.id ?? "new"}`}>
          <input id={`target-${item?.id ?? "new"}`} name="target" type="number" min={0} step="any" defaultValue={item?.target ?? ""} placeholder="e.g. 5" className="input" />
        </Field>
        <Field label="Unit" htmlFor={`unit-${item?.id ?? "new"}`}>
          <input id={`unit-${item?.id ?? "new"}`} name="unit" defaultValue={item?.unit} placeholder="posts" className="input" />
        </Field>
        <Field label="Weight" htmlFor={`weight-${item?.id ?? "new"}`}>
          <input id={`weight-${item?.id ?? "new"}`} name="weight" type="number" min={1} max={10} defaultValue={item?.weight ?? 1} className="input" />
        </Field>
      </div>
    </>
  );
}

export default async function EditChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFounder();
  const { id } = await params;
  const [checklist, teams] = await Promise.all([
    prisma.checklist.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } }, _count: { select: { reports: true } } } }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!checklist) notFound();
  const totalWeight = checklist.items.reduce((s, i) => s + i.weight, 0);

  return (
    <>
      <PageHeader title={checklist.name} crumbs={[{ href: "/settings", label: "Settings" }, { href: "/settings/checklists", label: "Performance checklists" }]} />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-brand">Items ({checklist.items.length} of {MAX_ITEMS})</h2>
            <p className="text-xs text-muted">
              Scoring: {Object.values(METHODS).map((m) => `${m.label} — ${m.help}`).join(" ")} The weekly score is the weighted average.
            </p>
          </div>
          {checklist.items.length === 0 && <EmptyState>No items yet. Add the first expectation below.</EmptyState>}
          {checklist.items.map((item, n) => (
            <Card key={item.id}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {n + 1}. <span className="text-muted">{METHODS[item.method as keyof typeof METHODS]?.label}{item.method === "TARGET" ? ` · target ${item.target} ${item.unit}` : ""} · weight {item.weight}
                  {totalWeight > 0 && ` (${Math.round((item.weight / totalWeight) * 100)}% of the score)`}</span>
                </p>
                <div className="flex gap-1">
                  {n > 0 && <form action={moveItem.bind(null, checklist.id, item.id, "up")}><button type="submit" className="btn-secondary px-2 py-1 text-xs" aria-label="Move up">↑</button></form>}
                  {n < checklist.items.length - 1 && <form action={moveItem.bind(null, checklist.id, item.id, "down")}><button type="submit" className="btn-secondary px-2 py-1 text-xs" aria-label="Move down">↓</button></form>}
                  <ConfirmButton action={deleteItem.bind(null, checklist.id, item.id)} message="Delete this item? Past reports keep their answers." className="btn-danger px-2 py-1 text-xs">Delete</ConfirmButton>
                </div>
              </div>
              <ActionForm action={saveItem.bind(null, checklist.id, item.id)}>
                <ItemFields item={item} />
                <SubmitButton className="btn-secondary">Save item</SubmitButton>
              </ActionForm>
            </Card>
          ))}
          {checklist.items.length < MAX_ITEMS ? (
            <Card title="Add an item">
              <ActionForm action={saveItem.bind(null, checklist.id, null)}>
                <ItemFields />
                <SubmitButton>Add item</SubmitButton>
              </ActionForm>
            </Card>
          ) : (
            <p className="text-sm text-muted">This checklist has the maximum of {MAX_ITEMS} items.</p>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Checklist settings">
            <ChecklistForm checklist={checklist} teams={teams} />
          </Card>
          <Card>
            <p className="mb-3 text-sm text-muted">
              Used in {checklist._count.reports} weekly reports. Changing or deleting items never changes past reports — their answers and scores are saved with them.
            </p>
            <ConfirmButton action={deleteChecklist.bind(null, checklist.id)} message="Delete this checklist? Past reports keep their answers and scores.">
              Delete checklist
            </ConfirmButton>
          </Card>
        </div>
      </div>
    </>
  );
}
