import type { Metadata } from "next";
import Link from "next/link";
import { reportsData, requireLeader, scopeTeams } from "@/lib/dashboard";
import { formatDate } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { DashHeader, DashTable, EmptyRow, hrefWith, Pagination, Panel, StatCard, StatGrid, StatusPill, Tabs, Td } from "@/components/dash";
import { UrlSelect } from "@/components/dash-client";

export const metadata: Metadata = { title: "Performance Report" };

export default async function PerformanceReportPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireLeader();
  const params = await searchParams;
  const teams = await scopeTeams(user);
  const tab = sp(params, "tab") === "monthly" ? "monthly" : "weekly";
  const f = { tab, team: sp(params, "team"), status: sp(params, "status"), q: sp(params, "q").trim(), page: sp(params, "page") } as const;
  const d = await reportsData(teams.map((t) => t.id), f);
  const href = (changes: Record<string, string>) => hrefWith("/dashboard/reports", params, changes);
  const statusOptions = tab === "monthly" ? [{ value: "COMPLETED", label: "Completed" }] : [{ value: "SUBMITTED", label: "Submitted" }, { value: "REVIEWED", label: "Reviewed" }];

  return (
    <>
      <DashHeader title="Performance Report" description="Review Weekly and monthly reports submitted by team members" />

      <StatGrid>
        <StatCard label="Total Reports" value={d.stats.total} />
        <StatCard label="Weekly Reports" value={d.stats.weekly} />
        <StatCard label="Monthly Reports" value={d.stats.monthly} note="Evaluations" />
        <StatCard label="Reviewed" value={d.stats.reviewed} note="Weekly" />
      </StatGrid>

      <Panel
        title="Submitted Reports"
        actions={
          <Tabs
            active={tab}
            items={[
              { value: "weekly", label: "Weekly Report", href: href({ tab: "", status: "" }) },
              { value: "monthly", label: "Monthly Report", href: href({ tab: "monthly", status: "" }) },
            ]}
          />
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          {teams.length > 1 && <UrlSelect name="team" label="Departments" value={f.team} options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
          <UrlSelect name="status" label="Status" value={f.status} options={statusOptions} />
        </div>
        {f.q && (
          <p className="mb-3 text-sm text-neutral-700">
            Showing names matching “{f.q}”. <a href={href({ q: "" })} className="underline">Clear search</a>
          </p>
        )}
        <DashTable head={["Name", "Departments", "Date", "Status", "Action"]}>
          {d.rows.map((r) => (
            <tr key={r.id}>
              <Td>
                <span className="inline-flex items-center gap-3">
                  <Avatar name={r.name} url={r.avatarUrl} size={24} />
                  {r.name}
                </span>
              </Td>
              <Td>{r.team}</Td>
              <Td>{formatDate(r.date)}</Td>
              <Td><StatusPill>{r.status}</StatusPill></Td>
              <Td>
                <Link href={r.href} className="underline underline-offset-4">View</Link>
              </Td>
            </tr>
          ))}
          {!d.rows.length && <EmptyRow cols={5}>No {tab === "monthly" ? "monthly evaluations" : "weekly reports"} match these filters.</EmptyRow>}
        </DashTable>
        <Pagination page={d.page} pages={d.pages} href={(p) => hrefWith("/dashboard/reports", params, { page: String(p) })} />
      </Panel>
    </>
  );
}
