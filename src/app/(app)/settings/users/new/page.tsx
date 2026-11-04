import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UserForm } from "../user-form";

export const metadata = { title: "Add person" };

export default async function NewUserPage() {
  await requireFounder();
  const teams = await prisma.team.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Add person" crumbs={[{ href: "/settings", label: "Settings" }]} />
      <UserForm teams={teams} />
    </>
  );
}
