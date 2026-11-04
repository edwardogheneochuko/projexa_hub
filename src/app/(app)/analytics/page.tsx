import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isFounder, isHead } from "@/lib/permissions";
import { sp, type SearchParams } from "@/lib/utils";
import { FilterBar, FilterSelect, PageHeader } from "@/components/ui";
import { OrgDashboard, PersonDashboard, RANGE_OPTIONS, TeamDashboard, parseRange } from "@/components/dashboards";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const weeks = parseRange(sp(params, "weeks"));

  if (isFounder(user)) {
    const teamId = sp(params, "team");
    const personId = sp(params, "person");
    const [teams, people] = await Promise.all([
      prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.user.findMany({
        where: { active: true, role: { not: "FOUNDER" }, ...(teamId ? { teamId } : {}) },
        orderBy: { name: "asc" },
      }),
    ]);
    const team = teams.find((t) => t.id === teamId);
    const person = personId ? await prisma.user.findUnique({ where: { id: personId }, include: { team: true } }) : null;

    return (
      <>
        <PageHeader
          title="Founder dashboard"
          description="Organisation-wide performance across every department and team, including the Alumni and Campus Chapter teams."
        />
        <FilterBar resetHref="/analytics">
          <FilterSelect name="team" label="Department / team" value={teamId} allLabel="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          <FilterSelect name="person" label="Individual" value={personId} allLabel="Everyone" options={people.map((p) => ({ value: p.id, label: p.name }))} />
          <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGE_OPTIONS} />
        </FilterBar>
        {person ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-brand">
              {person.name} <span className="font-normal text-muted">· {person.team?.name}</span>
            </h2>
            <PersonDashboard person={person} weeks={weeks} />
          </>
        ) : team ? (
          <>
            <h2 className="mb-4 text-lg font-semibold text-brand">{team.name}</h2>
            <TeamDashboard team={team} weeks={weeks} />
          </>
        ) : (
          <OrgDashboard weeks={weeks} />
        )}
      </>
    );
  }

  if (isHead(user) && user.team) {
    return (
      <>
        <PageHeader title={`${user.team.name} dashboard`} description="Your department's attendance, KPIs, reporting and evaluations." />
        <FilterBar>
          <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGE_OPTIONS} />
        </FilterBar>
        <TeamDashboard team={user.team} weeks={weeks} />
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Your attendance, weekly reports, KPIs and evaluations." />
      <FilterBar>
        <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGE_OPTIONS} />
      </FilterBar>
      <PersonDashboard person={user} weeks={weeks} />
    </>
  );
}
