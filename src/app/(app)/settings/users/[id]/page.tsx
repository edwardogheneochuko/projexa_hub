import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UserForm } from "../user-form";

export const metadata = { title: "Edit person" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFounder();
  const { id } = await params;
  const [user, teams] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!user) notFound();
  return (
    <>
      <PageHeader title={`Edit ${user.name}`} crumbs={[{ href: "/settings", label: "Settings" }]} />
      <UserForm user={user} teams={teams} />
    </>
  );
}
