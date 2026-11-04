import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canViewPerson } from "@/lib/permissions";
import { sp, type SearchParams } from "@/lib/utils";
import { FilterBar, FilterSelect, PageHeader } from "@/components/ui";
import { PersonDashboard, RANGE_OPTIONS, parseRange } from "@/components/dashboards";

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const person = await prisma.user.findUnique({ where: { id }, include: { team: true } });
  if (!person || !canViewPerson(user, person)) notFound();
  const weeks = parseRange(sp(await searchParams, "weeks"));
  return (
    <>
      <PageHeader
        title={person.name}
        description={[person.position, person.team?.name].filter(Boolean).join(" · ")}
        crumbs={person.team && user.id !== person.id ? [{ href: `/analytics/teams/${person.team.slug}`, label: person.team.name }] : []}
      />
      <FilterBar>
        <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGE_OPTIONS} />
      </FilterBar>
      <PersonDashboard person={person} weeks={weeks} />
    </>
  );
}
