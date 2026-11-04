import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isFounder, managedTeamIds } from "@/lib/permissions";
import { currentMonth, isValidMonth, monthLabel, monthOptions } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { Badge, Card, EmptyState, FilterBar, FilterSelect, PageHeader, TableWrap } from "@/components/ui";

export const metadata: Metadata = { title: "Monthly evaluations" };

export default async function EvaluationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const managed = managedTeamIds(user);
  const isManager = managed === null || managed.length > 0;
  const teamId = sp(params, "team");
  const personId = sp(params, "person");
  const month = isValidMonth(sp(params, "month")) ? sp(params, "month") : "";

  const where: Prisma.EvaluationWhereInput = {};
  if (managed === null) {
    if (teamId) where.teamId = teamId;
    if (personId) where.userId = personId;
  } else if (managed.length) {
    where.teamId = { in: managed };
    if (personId) where.userId = personId;
  } else {
    where.userId = user.id;
  }
  if (month) where.month = month;

  const peopleWhere: Prisma.UserWhereInput = {
    active: true,
    role: { not: "FOUNDER" },
    id: { not: user.id },
    ...(managed === null ? (teamId ? { teamId } : { teamId: { not: null } }) : { teamId: { in: managed } }),
  };
  const thisMonth = currentMonth();

  const [evals, teams, people, doneThisMonth] = await Promise.all([
    prisma.evaluation.findMany({ where, include: { user: true, team: true, evaluator: true }, orderBy: [{ month: "desc" }, { updatedAt: "desc" }], take: 200 }),
    managed === null ? prisma.team.findMany({ orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
    isManager ? prisma.user.findMany({ where: peopleWhere, include: { team: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isManager ? prisma.evaluation.findMany({ where: { month: thisMonth }, select: { userId: true } }) : Promise.resolve([]),
  ]);
  const done = new Set(doneThisMonth.map((d) => d.userId));
  const pending = people.filter((p) => !done.has(p.id));

  return (
    <>
      <PageHeader
        title="Monthly performance evaluations"
        description="Written evaluations covering attendance, KPI achievement, reporting consistency, contributions, strengths and areas for improvement. History is kept for future reference."
        actions={isManager && <Link href="/analytics/evaluations/write" className="btn-primary">Write evaluation</Link>}
      />
      <FilterBar resetHref="/analytics/evaluations">
        {isFounder(user) && <FilterSelect name="team" label="Department / team" value={teamId} allLabel="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
        {isManager && <FilterSelect name="person" label="Team member" value={personId} allLabel="Everyone" options={people.map((p) => ({ value: p.id, label: p.name }))} />}
        <FilterSelect name="month" label="Month" value={month} allLabel="All months" options={monthOptions(18)} />
      </FilterBar>

      {isManager && (
        <Card title={`${monthLabel(thisMonth)} progress`} className="mb-6">
          <p className="text-sm">
            <strong>{people.length - pending.length}</strong> of {people.length} evaluations recorded.
          </p>
          {pending.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pending.map((p) => (
                <Link key={p.id} href={`/analytics/evaluations/write?user=${p.id}&month=${thisMonth}`} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-brand-soft hover:text-brand">
                  {p.name} +
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {evals.length === 0 ? (
        <EmptyState>No evaluations match these filters.</EmptyState>
      ) : (
        <TableWrap>
          <thead className="border-b border-line bg-cream/60">
            <tr>
              <th className="th">Month</th>
              <th className="th">Team member</th>
              <th className="th">Department / team</th>
              <th className="th">Strengths</th>
              <th className="th">Evaluator</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {evals.map((e) => (
              <tr key={e.id}>
                <td className="td whitespace-nowrap">
                  <Link href={`/analytics/evaluations/${e.id}`} className="link">{monthLabel(e.month)}</Link>
                  {e.month === thisMonth && <span className="ml-2"><Badge tone="info">This month</Badge></span>}
                </td>
                <td className="td">{e.user.name}</td>
                <td className="td">{e.team.name}</td>
                <td className="td max-w-md text-muted"><span className="line-clamp-2">{e.strengths}</span></td>
                <td className="td text-muted">{e.evaluator.name}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
