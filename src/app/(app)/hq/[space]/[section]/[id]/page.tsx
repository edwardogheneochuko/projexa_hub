import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSection, titleField } from "@/lib/hq-config";
import { canDeleteInSection, canEditSection, canViewSection, parseData } from "@/lib/hq";
import { formatDate } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { FieldValue, RecordFields } from "@/components/hq";
import { deleteHqRecord, saveHqRecord } from "../../../actions";

type Params = Promise<{ space: string; section: string; id: string }>;

export default async function RecordPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const user = await requireUser();
  const p = await params;
  const found = getSection(p.space, p.section);
  if (!found || !canViewSection(user, found.space, found.section)) notFound();
  const { space, section } = found;
  const rec = await prisma.hqRecord.findUnique({ where: { id: p.id }, include: { updatedBy: true } });
  if (!rec || rec.space !== space.key || rec.section !== section.key) notFound();
  const d = parseData(rec.data);
  const q = await searchParams;
  const editing = sp(q, "edit") === "1" && canEditSection(user, space, section);
  const base = `/hq/${space.key}/${section.key}`;
  const crumbs = [
    { href: "/hq", label: "HQ" },
    { href: `/hq/${space.key}`, label: space.title },
    { href: base, label: section.title },
  ];
  const title = d[titleField(section).key] || "Untitled";

  return (
    <>
      <PageHeader
        title={title}
        description={`Last updated ${formatDate(rec.updatedAt)} by ${rec.updatedBy.name}`}
        crumbs={crumbs}
        actions={
          !editing && (
            <>
              {canEditSection(user, space, section) && <a href={`${base}/${rec.id}?edit=1`} className="btn-secondary">Edit</a>}
              {canDeleteInSection(user, space, section) && (
                <ConfirmButton action={deleteHqRecord.bind(null, space.key, section.key, rec.id)} message="Delete this record permanently?">
                  Delete
                </ConfirmButton>
              )}
            </>
          )
        }
      />
      {sp(q, "saved") === "1" && !editing && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved.</p>
      )}
      {editing ? (
        <ActionForm action={saveHqRecord.bind(null, space.key, section.key, rec.id)} className="card max-w-3xl p-5">
          <RecordFields section={section} data={d} />
          <div className="flex gap-2">
            <SubmitButton>Save changes</SubmitButton>
            <a href={`${base}/${rec.id}`} className="btn-secondary">Cancel</a>
          </div>
        </ActionForm>
      ) : (
        <Card className="max-w-3xl">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <div key={f.key} className={f.type === "longtext" ? "sm:col-span-2" : ""}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{f.label}</dt>
                <dd className="mt-1 text-sm">
                  <FieldValue field={f} value={d[f.key]} section={section} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </>
  );
}
