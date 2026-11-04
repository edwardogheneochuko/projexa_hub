"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSection } from "@/lib/hq-config";
import { canDeleteInSection, canEditSection, validateRecord } from "@/lib/hq";
import type { ActionResult } from "@/lib/utils";

export async function saveHqRecord(
  spaceKey: string,
  sectionKey: string,
  id: string | null,
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const found = getSection(spaceKey, sectionKey);
  if (!found || !canEditSection(user, found.space, found.section)) return { error: "You don't have permission to edit this section." };

  const result = validateRecord(found.section, fd);
  if ("error" in result) return { error: result.error };

  const data = JSON.stringify(result.data);
  let recordId = id;
  if (id) {
    const existing = await prisma.hqRecord.findUnique({ where: { id } });
    if (!existing || existing.space !== spaceKey || existing.section !== sectionKey) return { error: "Record not found." };
    await prisma.hqRecord.update({ where: { id }, data: { data, updatedById: user.id } });
  } else {
    const rec = await prisma.hqRecord.create({ data: { space: spaceKey, section: sectionKey, data, updatedById: user.id } });
    recordId = rec.id;
  }
  revalidatePath(`/hq/${spaceKey}`, "layout");
  redirect(`/hq/${spaceKey}/${sectionKey}/${recordId}?saved=1`);
}

export async function deleteHqRecord(spaceKey: string, sectionKey: string, id: string) {
  const user = await requireUser();
  const found = getSection(spaceKey, sectionKey);
  if (!found || !canDeleteInSection(user, found.space, found.section)) return;
  await prisma.hqRecord.deleteMany({ where: { id, space: spaceKey, section: sectionKey } });
  revalidatePath(`/hq/${spaceKey}`, "layout");
  redirect(`/hq/${spaceKey}/${sectionKey}`);
}
