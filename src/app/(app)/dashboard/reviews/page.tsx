import type { Metadata } from "next";
import Link from "next/link";
import { requireLeader, reviewsData, scopeTeams } from "@/lib/dashboard";
import { monthLabel, weekLabel } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { DashHeader, DashTable, EmptyRow, hrefWith, Pagination, Panel, pct0, Ring, StatCard, StatGrid, Tabs, Td, TrendArrow } from "@/components/dash";
import { DeptBars, UrlSelect } from "@/components/dash-client";

export const metadata: Metadata = { title: "Team Reviews" };

export default async function TeamReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireLeader();
  const params = await searchParams;
  const teams = await scopeTeams(user);
  const order = sp(params, "order") === "lowest" ? "lowest" : "highest";
  const show = ["weekly", "monthly"].includes(sp(params, "show")) ? sp(params, "show") : "all";
  const team = sp(params, "team");
  const d = await reviewsData(teams.map((t) => t.id), { order, team, page: sp(params, "page") });
  const href = (changes: Record<string, string>) => hrefWith("/dashboard/reviews", params, changes);
  const head = ["Departments", ...(show !== "monthly" ? ["Weekly"] : []), ...(show !== "weekly" ? ["Monthly"] : []), "Trend"];

  return (
    <>
      <DashHeader title="Team Reviews & Statistics" description="Overview of team evaluations, reviews and performance statistics." />

      <StatGrid>
        <StatCard label="Total Evaluations" value={d.stats.total} note={monthLabel(d.month)} />
        <StatCard label="Completed" value={d.stats.completed} />
        <StatCard label="Pending" value={d.stats.pending} />
        <StatCard label="Average Performance" value={pct0(d.stats.average)} />
      </StatGrid>

      <div className="mb-6 grid gap-6 xl:grid-cols-[2fr_3fr]">
        <Panel title="Review Statistics" actions={<Link href="/analytics/insights" className="text-sm tracking-wide underline underline-offset-4">View Details</Link>}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 py-2">
            {d.rings.map((r) => (
              <Ring key={r.label} label={r.label} value={r.value} />
            ))}
          </div>
          <p className="mt-4 text-xs text-neutral-600">Last 4 weeks. On Track = at or above the 80% benchmark.</p>
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 bg-black" /> Top 5 Performing Dept.</span>}>
          <div className="mb-4">
            <UrlSelect name="order" label="Performance" value={order} allLabel={null} options={[{ value: "highest", label: "Highest" }, { value: "lowest", label: "Lowest" }]} />
          </div>
          <DeptBars data={d.ranked} />
          <p className="mt-2 text-xs text-neutral-600">KPI achievement over the last 4 weeks.</p>
        </Panel>
      </div>

      <Panel
        title="Team Performance Trend"
        actions={
          <Tabs
            active={show}
            items={[
              { value: "all", label: "All", href: href({ show: "" }) },
              { value: "weekly", label: "Weekly Trend", href: href({ show: "weekly" }) },
              { value: "monthly", label: "Monthly Trend", href: href({ show: "monthly" }) },
            ]}
          />
        }
      >
        {teams.length > 1 && (
          <div className="mb-4 flex justify-end">
            <UrlSelect name="team" label="Departments" value={team} options={teams.map((t) => ({ value: t.id, label: t.name }))} />
          </div>
        )}
        <DashTable head={head} minWidth={520}>
          {d.trendRows.map((r) => (
            <tr key={r.team.id}>
              <Td>{r.team.name}</Td>
              {show !== "monthly" && <Td>{pct0(r.weekly)}</Td>}
              {show !== "weekly" && <Td>{pct0(r.monthly)}</Td>}
              <Td><TrendArrow trend={r.trend} /></Td>
            </tr>
          ))}
          {!d.trendRows.length && <EmptyRow cols={head.length}>No departments to show.</EmptyRow>}
        </DashTable>
        <p className="mt-3 text-xs text-neutral-600">
          Weekly = KPI achievement for {weekLabel(d.lastWeek)}. Monthly = the last 4 complete weeks. Trend compares the last two weeks.
        </p>
        <Pagination page={d.page} pages={d.pages} href={(p) => hrefWith("/dashboard/reviews", params, { page: String(p) })} />
      </Panel>
    </>
  );
}
