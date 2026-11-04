import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSection } from "@/lib/hq-config";
import { canEditSection } from "@/lib/hq";
import { PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { RecordFields } from "@/components/hq";
import { saveHqRecord } from "../../../actions";

export const metadata = { title: "Add record" };

export default async function NewRecordPage({ params }: { params: Promise<{ space: string; section: string }> }) {
  const user = await requireUser();
  const p = await params;
  const found = getSection(p.space, p.section);
  if (!found || !canEditSection(user, found.space, found.section)) notFound();
  const { space, section } = found;
  return (
    <>
      <PageHeader
        title={`Add to ${section.title}`}
        crumbs={[
          { href: "/hq", label: "HQ" },
          { href: `/hq/${space.key}`, label: space.title },
          { href: `/hq/${space.key}/${section.key}`, label: section.title },
        ]}
      />
      <ActionForm action={saveHqRecord.bind(null, space.key, section.key, null)} className="card max-w-3xl p-5">
        <RecordFields section={section} />
        <SubmitButton>Save record</SubmitButton>
      </ActionForm>
    </>
  );
}
