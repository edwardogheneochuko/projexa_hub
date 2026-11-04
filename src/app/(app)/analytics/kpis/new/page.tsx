import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { managedTeamIds } from "@/lib/permissions";
import { currentWeek, isValidWeek } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { KpiForm } from "../kpi-form";

export const metadata: Metadata = { title: "Add KPI" };

export default async function NewKpiPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const managed = managedTeamIds(user);
  if (managed !== null && managed.length === 0) notFound();
  const params = await searchParams;
  const teams = await prisma.team.findMany({ where: managed === null ? {} : { id: { in: managed } }, orderBy: { sortOrder: "asc" } });
  const teamId = teams.find((t) => t.id === sp(params, "team"))?.id ?? teams[0].id;
  const period = isValidWeek(sp(params, "period")) ? sp(params, "period") : currentWeek();
  return (
    <>
      <PageHeader title="Add KPI" crumbs={[{ href: `/analytics/kpis?team=${teamId}&period=${period}`, label: "KPI matrix" }]} />
      <KpiForm teams={teams} teamId={teamId} period={period} />
    </>
  );
}
