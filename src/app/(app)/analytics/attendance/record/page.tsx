import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, managedTeamIds } from "@/lib/permissions";
import { isValidDate, toDateStr, today, formatDate } from "@/lib/periods";
import { sp, type SearchParams } from "@/lib/utils";
import { ATTENDANCE_LABEL, EmptyState, PageHeader } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { recordAttendance } from "../../actions";

export const metadata: Metadata = { title: "Record attendance" };

export default async function RecordAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const managed = managedTeamIds(user);
  if (managed !== null && managed.length === 0) notFound();
  const params = await searchParams;

  const teams = await prisma.team.findMany({
    where: managed === null ? {} : { id: { in: managed } },
    orderBy: { sortOrder: "asc" },
  });
  const teamId = sp(params, "team") || teams[0]?.id || "";
  const date = isValidDate(sp(params, "date")) ? sp(params, "date") : toDateStr(today());
  const session = sp(params, "session").slice(0, 200);
  const ready = Boolean(teamId && session && canManageTeam(user, teamId));

  const [members, existing, recentSessions] = await Promise.all([
    ready ? prisma.user.findMany({ where: { teamId, active: true, role: { not: "FOUNDER" } }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    ready ? prisma.attendance.findMany({ where: { teamId, date, session } }) : Promise.resolve([]),
    prisma.attendance.findMany({ where: { teamId }, distinct: ["session"], select: { session: true }, orderBy: { date: "desc" }, take: 8 }),
  ]);
  const byUser = new Map(existing.map((e) => [e.userId, e]));

  return (
    <>
      <PageHeader title="Record attendance" crumbs={[{ href: "/analytics/attendance", label: "Attendance" }]} description="Choose the team, date and session, then mark each person." />

      <form method="get" className="card mb-6 grid gap-3 p-4 sm:grid-cols-4 sm:items-end">
        <div>
          <label className="label" htmlFor="team">Department / team</label>
          <select id="team" name="team" defaultValue={teamId} className="input">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input id="date" type="date" name="date" defaultValue={date} className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="session">Meeting / training session</label>
          <input id="session" name="session" defaultValue={session} list="sessions" placeholder="e.g. Weekly team meeting" className="input" required />
          <datalist id="sessions">
            {recentSessions.map((s) => (
              <option key={s.session} value={s.session} />
            ))}
          </datalist>
        </div>
        <button className="btn-secondary" type="submit">Load team</button>
      </form>

      {!ready ? (
        <EmptyState>Enter a session name and select “Load team” to start marking attendance.</EmptyState>
      ) : members.length === 0 ? (
        <EmptyState>This team has no active members.</EmptyState>
      ) : (
        <ActionForm action={recordAttendance}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="session" value={session} />
          <div className="card divide-y divide-line">
            <div className="px-4 py-3 text-sm text-muted">
              {session} · {formatDate(date)} · {members.length} people{existing.length > 0 && ` · ${existing.length} already recorded (editing)`}
            </div>
            {members.map((m) => {
              const cur = byUser.get(m.id);
              return (
                <fieldset key={m.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <input type="hidden" name="member" value={m.id} />
                  <legend className="sr-only">{m.name}</legend>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted">{m.position}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Status for ${m.name}`}>
                    {Object.entries(ATTENDANCE_LABEL).map(([value, label]) => (
                      <label key={value} className="cursor-pointer">
                        <input type="radio" name={`status_${m.id}`} value={value} defaultChecked={(cur?.status ?? "PRESENT") === value} className="peer sr-only" />
                        <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-xs font-medium peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <input name={`remarks_${m.id}`} defaultValue={cur?.remarks ?? ""} placeholder="Remarks (optional)" className="input" aria-label={`Remarks for ${m.name}`} />
                </fieldset>
              );
            })}
          </div>
          <SubmitButton>Save attendance</SubmitButton>
        </ActionForm>
      )}
    </>
  );
}
