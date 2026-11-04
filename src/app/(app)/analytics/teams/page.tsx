import type { Metadata } from "next";
import Link from "next/link";
import { requireFounder } from "@/lib/auth";
import { getPerformance } from "@/lib/metrics";
import { recentWeeks } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { Card, FilterBar, FilterSelect, PageHeader } from "@/components/ui";
import { RANGE_OPTIONS, TeamComparisonTable, parseRange } from "@/components/dashboards";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireFounder();
  const weeks = parseRange(sp(await searchParams, "weeks"));
  const perf = await getPerformance({ weeks: recentWeeks(weeks) });
  return (
    <>
      <PageHeader title="Departments & teams" description="Every official team is tracked here, including the Alumni and Campus Chapter teams." />
      <FilterBar>
        <FilterSelect name="weeks" label="Reporting period" value={String(weeks)} allLabel={null} options={RANGE_OPTIONS} />
      </FilterBar>
      <Card title="Comparison">
        <TeamComparisonTable perf={perf} />
      </Card>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {perf.byTeam.map((t) => (
          <Link key={t.team.id} href={`/analytics/teams/${t.team.slug}`} className="card block p-4 hover:border-brand-soft">
            <p className="font-semibold text-brand">{t.team.name}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{t.team.description}</p>
            <p className="mt-2 text-xs text-muted">{t.members} members</p>
          </Link>
        ))}
      </div>
    </>
  );
}
