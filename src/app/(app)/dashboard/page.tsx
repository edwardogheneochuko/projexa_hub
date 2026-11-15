import type { Metadata } from "next";
import { dirOf, overviewData, requireLeader, ROLE_NAMES, scopeTeams } from "@/lib/dashboard";
import { formatDate, monthLabel, recentWeeks, weekLabel } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { DashHeader, DashTable, EmptyRow, hrefWith, Pagination, Panel, StatCard, StatGrid, StatusPill, Tabs, Td } from "@/components/dash";
import { ScoreColumns, UrlSelect } from "@/components/dash-client";

export const metadata: Metadata = { title: "Team Overview" };

export default async function TeamOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireLeader();
  const params = await searchParams;
  const teams = await scopeTeams(user);
  const view = sp(params, "view") === "monthly" ? "monthly" : "weekly";
  const status = sp(params, "status");
  const table = sp(params, "table") === "performance" ? "performance" : "members";
  const f = { team: sp(params, "team"), role: sp(params, "role"), status, q: sp(params, "q").trim(), page: sp(params, "page"), view, week: sp(params, "week"), sort: sp(params, "sort"), dir: dirOf(sp(params, "dir")) } as const;
  const d = await overviewData(teams.map((t) => t.id), f);
  const href = (changes: Record<string, string>) => hrefWith("/dashboard", params, changes);

  return (
    <>
      <DashHeader title="Team Overview Dashboard" description="View your team composition and performance across departments" />

      <StatGrid>
        <StatCard label="Total Members" value={d.stats.total} note={d.stats.joined ? `+${d.stats.joined} in 30 days` : undefined} />
        <StatCard label="Active Members" value={d.stats.active} />
        <StatCard label="Inactive Members" value={d.stats.inactive} />
        <StatCard label="Department Total" value={d.stats.departments} />
      </StatGrid>

      <Panel
        className="mb-6"
        title={<span className="flex items-center gap-2"><span aria-hidden className="h-2.5 w-2.5 bg-black" /> {view === "monthly" ? "Monthly" : "Weekly"} Performance Score</span>}
        actions={
          <>
            <Tabs
              active={view}
              items={[
                { value: "weekly", label: "Weekly", href: href({ view: "" }) },
                { value: "monthly", label: "Monthly", href: href({ view: "monthly" }) },
              ]}
            />
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e5e5] px-3 py-1.5 text-xs tracking-wide sm:text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
              {d.range}
            </span>
          </>
        }
      >
        <ScoreColumns data={d.chart} />
        <p className="mt-2 text-xs text-neutral-600">Score = average of the weekly checklist scores submitted for the {view === "monthly" ? "month" : "week"} (set up in Settings → Performance checklists). Empty columns have no scored reports yet.</p>
      </Panel>

      <Panel
        title="Team Members"
        actions={
          <>
            <Tabs
              active={table}
              items={[
                { value: "members", label: "Members", href: href({ table: "" }) },
                { value: "performance", label: "Performance", href: href({ table: "performance" }) },
              ]}
            />
            <Tabs
              active={status || "all"}
              items={[
                { value: "all", label: "All", href: href({ status: "" }) },
                { value: "active", label: "Active", href: href({ status: "active" }) },
                { value: "inactive", label: "Inactive", href: href({ status: "inactive" }) },
              ]}
            />
          </>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          {teams.length > 1 && <UrlSelect name="team" label="Departments" value={f.team} options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
          <UrlSelect name="role" label="Roles" value={f.role} options={Object.entries(ROLE_NAMES).filter(([v]) => v !== "FOUNDER").map(([value, label]) => ({ value, label }))} />
          {table === "performance" && (
            <UrlSelect name="week" label="Week" value={d.week} allLabel={null} options={recentWeeks(8).reverse().map((w) => ({ value: w, label: weekLabel(w) }))} />
          )}
        </div>
        {f.q && (
          <p className="mb-3 text-sm text-neutral-700">
            Showing names matching “{f.q}”. <a href={href({ q: "" })} className="underline">Clear search</a>
          </p>
        )}
        {table === "performance" ? (
          <DashTable head={["Full Name", "Department", "Role", "Weekly Submission", "Weekly Score", "Monthly Evaluation", "Benchmark", "Status"]} minWidth={980} server={{ keys: ["name", "team", "role", null, null, null, null, null], sort: f.sort, dir: f.dir }}>
            {d.performance.map(({ member: m, report, evaluation, benchmark, status: st }) => (
              <tr key={m.id}>
                <Td>
                  <a href={`/analytics/people/${m.id}`} className="inline-flex items-center gap-3 hover:underline">
                    <Avatar name={m.name} url={m.avatarUrl} size={24} />
                    {m.name}
                  </a>
                </Td>
                <Td>{m.team?.name ?? "—"}</Td>
                <Td>{ROLE_NAMES[m.role] ?? m.role}</Td>
                <Td>
                  {report ? <a href={`/analytics/reports/${report.id}`} className="underline underline-offset-4">{report.status === "REVIEWED" ? "Submitted · reviewed" : "Submitted"}</a> : <span className="text-neutral-500">Not Submitted</span>}
                </Td>
                <Td>{report?.score != null ? `${Math.round(report.score)}%` : "—"}</Td>
                <Td>{evaluation ? <a href={`/analytics/evaluations/${evaluation.id}`} className="underline underline-offset-4">{evaluation.score != null ? `${Math.round(evaluation.score)}%` : "Written"}</a> : "—"}</Td>
                <Td>{benchmark != null ? `${benchmark}%` : "—"}</Td>
                <Td>{st ? <StatusPill>{st}</StatusPill> : "—"}</Td>
              </tr>
            ))}
            {!d.performance.length && <EmptyRow cols={8}>No team members match these filters.</EmptyRow>}
          </DashTable>
        ) : (
        <DashTable head={["Name", "Departments", "Role", "Date Joined", "Status"]} server={{ keys: ["name", "team", "role", "joined", "status"], sort: f.sort, dir: f.dir }}>
          {d.members.map((m) => (
            <tr key={m.id}>
              <Td>
                <a href={`/directory/${m.id}`} className="inline-flex items-center gap-3 hover:underline">
                  <Avatar name={m.name} url={m.avatarUrl} size={24} />
                  {m.name}
                </a>
              </Td>
              <Td>{m.team?.name ?? "—"}</Td>
              <Td>{ROLE_NAMES[m.role] ?? m.role}</Td>
              <Td>{formatDate(m.createdAt)}</Td>
              <Td><StatusPill>{m.active ? "Active" : "Inactive"}</StatusPill></Td>
            </tr>
          ))}
          {!d.members.length && <EmptyRow cols={5}>No team members match these filters.</EmptyRow>}
        </DashTable>
        )}
        {table === "performance" && (
          <p className="mt-3 text-xs text-neutral-600">
            {weekLabel(d.week)}. Weekly Score comes from the person&apos;s checklist; Monthly Evaluation is the {monthLabel(d.month)} evaluation&apos;s average weekly score. Status: On Track at or above the benchmark, otherwise Needs Improvement.
          </p>
        )}
        <Pagination page={d.page} pages={d.pages} href={(p) => hrefWith("/dashboard", params, { page: String(p) })} />
      </Panel>
    </>
  );
}
