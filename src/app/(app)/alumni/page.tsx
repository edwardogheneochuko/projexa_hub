import type { Metadata } from "next";
import Link from "next/link";
import { activitySummary, countBy, requireSpace, sectionRows } from "@/lib/community";
import { formatDate, isValidDate, toDateStr, today } from "@/lib/periods";
import { DashHeader, DashTable, EmptyRow, Panel, StatCard, StatGrid, StatusPill, Td } from "@/components/dash";
import { CountColumns } from "@/components/dash-client";

export const metadata: Metadata = { title: "Alumni" };

const fmt = (d?: string) => (d && isValidDate(d) ? formatDate(d) : "—");

export default async function AlumniPage() {
  await requireSpace("alumni");
  const [directory, leadership, activities, opportunities] = await Promise.all([
    sectionRows("alumni", "directory"),
    sectionRows("alumni", "leadership"),
    sectionRows("alumni", "activities"),
    sectionRows("alumni", "opportunities"),
  ]);
  const a = activitySummary(activities);
  const todayStr = toDateStr(today());
  const openOpps = opportunities.filter((o) => !o.data.deadline || o.data.deadline >= todayStr).length;
  const byCohort = countBy(directory, "cohort").slice(0, 8);
  const manage = (section: string) => <Link href={`/hq/alumni/${section}`} className="text-sm tracking-wide underline underline-offset-4">Manage in HQ</Link>;

  return (
    <>
      <DashHeader title="Projexa Alumni" description="Alumni community, engagement and participation across Projexa Hub" />

      <StatGrid>
        <StatCard label="Alumni in Directory" value={directory.length} />
        <StatCard label="Activities" value={a.activitiesThisYear} note={a.year} />
        <StatCard label="Participants" value={a.participantsThisYear} note={a.year} />
        <StatCard label="Open Opportunities" value={openOpps} />
      </StatGrid>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Participation" actions={manage("activities")}>
          <CountColumns data={a.participantsPerMonth} unit="Participants" />
          <p className="mt-2 text-xs text-neutral-600">Participants in alumni activities per month, last 6 months.</p>
        </Panel>
        <Panel title="Alumni by Cohort" actions={manage("directory")}>
          <CountColumns data={byCohort} unit="Alumni" empty="No alumni in the directory yet." />
          <p className="mt-2 text-xs text-neutral-600">From the cohort / year recorded in the alumni directory.</p>
        </Panel>
      </div>

      <Panel title="Alumni Activities" className="mb-6" actions={manage("activities")}>
        <DashTable head={["Activity", "Type", "Date", "Participants", "Status"]}>
          {[...a.upcoming, ...a.recent].slice(0, 10).map((r) => (
            <tr key={r.id}>
              <Td><Link href={r.href} className="hover:underline">{r.data.title || "Untitled"}</Link></Td>
              <Td>{r.data.type || "—"}</Td>
              <Td>{fmt(r.data.date)}</Td>
              <Td>{r.data.participants || "—"}</Td>
              <Td><StatusPill>{(r.data.date ?? "") >= todayStr ? "Upcoming" : "Held"}</StatusPill></Td>
            </tr>
          ))}
          {!activities.length && <EmptyRow cols={5}>No alumni activities recorded yet. Add them in the Alumni HQ workspace.</EmptyRow>}
        </DashTable>
      </Panel>

      <div className="grid gap-6 2xl:grid-cols-[3fr_2fr]">
        <Panel title="Alumni Directory" actions={manage("directory")}>
          <DashTable head={["Name", "Cohort / year", "Occupation", "Location"]}>
            {directory.slice(0, 10).map((r) => (
              <tr key={r.id}>
                <Td><Link href={r.href} className="hover:underline">{r.data.title || "Unnamed"}</Link></Td>
                <Td>{r.data.cohort || "—"}</Td>
                <Td>{r.data.occupation || "—"}</Td>
                <Td>{r.data.location || "—"}</Td>
              </tr>
            ))}
            {!directory.length && <EmptyRow cols={4}>No alumni in the directory yet.</EmptyRow>}
          </DashTable>
          {directory.length > 10 && <p className="mt-3 text-sm"><Link href="/hq/alumni/directory" className="underline">See all {directory.length} alumni</Link></p>}
        </Panel>
        <Panel title="Alumni Leadership" actions={manage("leadership")}>
          <DashTable head={["Name", "Position", "Term"]} minWidth={360}>
            {leadership.map((r) => (
              <tr key={r.id}>
                <Td><Link href={r.href} className="hover:underline">{r.data.title || "Unnamed"}</Link></Td>
                <Td>{r.data.position || "—"}</Td>
                <Td>{r.data.term || "—"}</Td>
              </tr>
            ))}
            {!leadership.length && <EmptyRow cols={3}>No leadership recorded yet.</EmptyRow>}
          </DashTable>
        </Panel>
      </div>
    </>
  );
}
