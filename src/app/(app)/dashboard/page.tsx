import type { Metadata } from "next";
import { overviewData, requireLeader, ROLE_NAMES, scopeTeams } from "@/lib/dashboard";
import { formatDate } from "@/lib/periods";
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
  const f = { team: sp(params, "team"), role: sp(params, "role"), status, q: sp(params, "q").trim(), page: sp(params, "page"), view } as const;
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
        <p className="mt-2 text-xs text-neutral-600">Score = average KPI achievement for the {view === "monthly" ? "month" : "week"}, each KPI capped at 100%. Empty columns have no KPI results yet.</p>
      </Panel>

      <Panel
        title="Team Members"
        actions={
          <Tabs
            active={status || "all"}
            items={[
              { value: "all", label: "All", href: href({ status: "" }) },
              { value: "active", label: "Active", href: href({ status: "active" }) },
              { value: "inactive", label: "Inactive", href: href({ status: "inactive" }) },
            ]}
          />
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          {teams.length > 1 && <UrlSelect name="team" label="Departments" value={f.team} options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
          <UrlSelect name="role" label="Roles" value={f.role} options={[{ value: "HEAD", label: "Team Leader" }, { value: "MEMBER", label: "Team Member" }]} />
        </div>
        {f.q && (
          <p className="mb-3 text-sm text-neutral-700">
            Showing names matching “{f.q}”. <a href={href({ q: "" })} className="underline">Clear search</a>
          </p>
        )}
        <DashTable head={["Name", "Departments", "Role", "Date Joined", "Status"]}>
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
        <Pagination page={d.page} pages={d.pages} href={(p) => hrefWith("/dashboard", params, { page: String(p) })} />
      </Panel>
    </>
  );
}
