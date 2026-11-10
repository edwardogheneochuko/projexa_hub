import type { Metadata } from "next";
import Link from "next/link";
import { activitySummary, countBy, requireSpace, sectionRows } from "@/lib/community";
import { formatDate, isValidDate, toDateStr, today } from "@/lib/periods";
import { DashHeader, DashTable, EmptyRow, Panel, StatCard, StatGrid, StatusPill, Td } from "@/components/dash";
import { CountColumns } from "@/components/dash-client";

export const metadata: Metadata = { title: "Campus Structure" };

const fmt = (d?: string) => (d && isValidDate(d) ? formatDate(d) : "—");

export default async function CampusPage() {
  await requireSpace("campus");
  const [chapters, members, activities] = await Promise.all([
    sectionRows("campus", "chapters"),
    sectionRows("campus", "chapter-members"),
    sectionRows("campus", "activities"),
  ]);
  const a = activitySummary(activities);
  const todayStr = toDateStr(today());
  const active = chapters.filter((c) => c.data.status === "Active").length;
  const leaders = members.filter((m) => m.data.role === "Chapter lead" || m.data.role === "Executive");
  // Participation per chapter, from the "Chapter" named on each activity.
  const perChapter = new Map<string, number>();
  for (const r of activities) {
    const k = r.data.chapter || "Not set";
    perChapter.set(k, (perChapter.get(k) ?? 0) + (Number(r.data.participants) || 0));
  }
  const byChapter = [...perChapter.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  const byStatus = countBy(chapters, "status");
  const manage = (section: string) => <Link href={`/hq/campus/${section}`} className="text-sm tracking-wide underline underline-offset-4">Manage in HQ</Link>;

  return (
    <>
      <DashHeader title="Campus Structure" description="Campus chapters, leadership and activities across Projexa Hub" />

      <StatGrid>
        <StatCard label="Campus Chapters" value={chapters.length} note={byStatus.length ? `${active} active` : undefined} />
        <StatCard label="Chapter Members" value={members.length} note={leaders.length ? `${leaders.length} leaders` : undefined} />
        <StatCard label="Activities" value={a.activitiesThisYear} note={a.year} />
        <StatCard label="Participants" value={a.participantsThisYear} note={a.year} />
      </StatGrid>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Participation" actions={manage("activities")}>
          <CountColumns data={a.participantsPerMonth} unit="Participants" />
          <p className="mt-2 text-xs text-neutral-600">Participants in chapter activities per month, last 6 months.</p>
        </Panel>
        <Panel title="Participation by Chapter" actions={manage("activities")}>
          <CountColumns data={byChapter} unit="Participants" empty="No chapter activities recorded yet." />
          <p className="mt-2 text-xs text-neutral-600">All recorded activities, by the chapter named on each.</p>
        </Panel>
      </div>

      <Panel title="Campus Directory" className="mb-6" actions={manage("chapters")}>
        <DashTable head={["Chapter", "Institution", "Location", "Chapter lead", "Status"]}>
          {chapters.map((r) => (
            <tr key={r.id}>
              <Td><Link href={r.href} className="hover:underline">{r.data.title || "Unnamed"}</Link></Td>
              <Td>{r.data.institution || "—"}</Td>
              <Td>{r.data.location || "—"}</Td>
              <Td>{r.data.lead || "—"}</Td>
              <Td>{r.data.status ? <StatusPill>{r.data.status}</StatusPill> : "—"}</Td>
            </tr>
          ))}
          {!chapters.length && <EmptyRow cols={5}>No campus chapters recorded yet. Add them in the Campus Structure HQ workspace.</EmptyRow>}
        </DashTable>
      </Panel>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Panel title="Chapter Activities" actions={manage("activities")}>
          <DashTable head={["Activity", "Chapter", "Date", "Participants"]}>
            {[...a.upcoming, ...a.recent].slice(0, 10).map((r) => (
              <tr key={r.id}>
                <Td><Link href={r.href} className="hover:underline">{r.data.title || "Untitled"}</Link></Td>
                <Td>{r.data.chapter || "—"}</Td>
                <Td>{fmt(r.data.date)}{(r.data.date ?? "") >= todayStr && " (upcoming)"}</Td>
                <Td>{r.data.participants || "—"}</Td>
              </tr>
            ))}
            {!activities.length && <EmptyRow cols={4}>No chapter activities recorded yet.</EmptyRow>}
          </DashTable>
        </Panel>
        <Panel title="Campus Leadership" actions={manage("chapter-members")}>
          <DashTable head={["Name", "Chapter", "Role"]} minWidth={420}>
            {leaders.map((r) => (
              <tr key={r.id}>
                <Td><Link href={r.href} className="hover:underline">{r.data.title || "Unnamed"}</Link></Td>
                <Td>{r.data.chapter || "—"}</Td>
                <Td>{r.data.role}</Td>
              </tr>
            ))}
            {!leaders.length && <EmptyRow cols={3}>No chapter leads or executives recorded yet.</EmptyRow>}
          </DashTable>
        </Panel>
      </div>
    </>
  );
}
