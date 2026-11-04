import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, managedTeamIds } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { KpiForm } from "../kpi-form";
import { deleteKpi } from "../../actions";

export const metadata: Metadata = { title: "Update KPI" };

export default async function EditKpiPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const kpi = await prisma.kpi.findUnique({ where: { id } });
  if (!kpi || !canManageTeam(user, kpi.teamId)) notFound();
  const managed = managedTeamIds(user);
  const teams = await prisma.team.findMany({ where: managed === null ? {} : { id: { in: managed } }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader
        title={`Update KPI: ${kpi.name}`}
        crumbs={[{ href: `/analytics/kpis?team=${kpi.teamId}&period=${kpi.period}`, label: "KPI matrix" }]}
        actions={<ConfirmButton action={deleteKpi.bind(null, kpi.id)} message="Delete this KPI record?">Delete</ConfirmButton>}
      />
      <KpiForm kpi={kpi} teams={teams} teamId={kpi.teamId} period={kpi.period} />
    </>
  );
}
