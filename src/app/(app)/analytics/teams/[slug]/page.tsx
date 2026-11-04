import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewTeamAnalytics, isFounder } from "@/lib/permissions";
import { sp, type SearchParams } from "@/lib/utils";
import { FilterBar, FilterSelect, PageHeader } from "@/components/ui";
import { RANGE_OPTIONS, TeamDashboard, parseRange } from "@/components/dashboards";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const user = await requireUser();
  const { slug } = await params;
  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team || !canViewTeamAnalytics(user, team.id)) notFound();
  const weeks = parseRange(sp(await searchParams, "weeks"));
  return (
    <>
      <PageHeader
        title={`${team.name} team`}
        description={team.description}
        crumbs={isFounder(user) ? [{ href: "/analytics/teams", label: "Teams" }] : [{ href: "/analytics", label: "Dashboard" }]}
      />
      <FilterBar>
        <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGE_OPTIONS} />
      </FilterBar>
      <TeamDashboard team={team} weeks={weeks} />
    </>
  );
}
