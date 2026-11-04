import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageTeam, isFounder, managedTeamIds } from "@/lib/permissions";
import { attendanceCounts, attendanceRate } from "@/lib/metrics";
import { formatDate, isValidDate } from "@/lib/periods";
import { pct, sp, type SearchParams } from "@/lib/utils";
import { ATTENDANCE_LABEL, ATTENDANCE_TONE, Badge, EmptyState, FilterBar, FilterSelect, PageHeader, StatTile, TableWrap } from "@/components/ui";
import { ConfirmButton } from "@/components/forms";
import { deleteAttendance } from "../actions";

export const metadata: Metadata = { title: "Attendance" };

const LIMIT = 300;

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const managed = managedTeamIds(user);
  const isManager = managed === null || managed.length > 0;

  const teamId = sp(params, "team");
  const personId = sp(params, "person");
  const status = sp(params, "status");
  const from = sp(params, "from");
  const to = sp(params, "to");

  // Scope: Founder → everything; Head → own team; Member → own records only.
  const where: Prisma.AttendanceWhereInput = {};
  if (managed === null) {
    if (teamId) where.teamId = teamId;
    if (personId) where.userId = personId;
  } else if (managed.length) {
    where.teamId = { in: managed };
    if (personId) where.userId = personId;
  } else {
    where.userId = user.id;
  }
  if (["PRESENT", "ABSENT", "LATE", "EXCUSED"].includes(status)) where.status = status;
  if (isValidDate(from) || isValidDate(to)) {
    where.date = { ...(isValidDate(from) ? { gte: from } : {}), ...(isValidDate(to) ? { lte: to } : {}) };
  }

  const [rows, teams, people, allForStats] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { user: true, team: true, recordedBy: true },
      orderBy: [{ date: "desc" }, { session: "asc" }],
      take: LIMIT,
    }),
    managed === null ? prisma.team.findMany({ orderBy: { sortOrder: "asc" } }) : Promise.resolve([]),
    isManager
      ? prisma.user.findMany({
          where: { role: { not: "FOUNDER" }, ...(managed === null ? (teamId ? { teamId } : {}) : { teamId: { in: managed } }) },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.attendance.findMany({ where, select: { status: true } }),
  ]);
  const counts = attendanceCounts(allForStats);

  return (
    <>
      <PageHeader
        title="Attendance"
        description={isManager ? "Attendance records for meetings and training sessions." : "Your attendance history."}
        actions={isManager && <Link href="/analytics/attendance/record" className="btn-primary">Record attendance</Link>}
      />
      <FilterBar resetHref="/analytics/attendance">
        {isFounder(user) && <FilterSelect name="team" label="Department / team" value={teamId} allLabel="All teams" options={teams.map((t) => ({ value: t.id, label: t.name }))} />}
        {isManager && <FilterSelect name="person" label="Person" value={personId} allLabel="Everyone" options={people.map((p) => ({ value: p.id, label: p.name }))} />}
        <FilterSelect name="status" label="Status" value={status} options={Object.entries(ATTENDANCE_LABEL).map(([value, label]) => ({ value, label }))} />
        <div>
          <label className="label text-xs" htmlFor="from">From</label>
          <input id="from" type="date" name="from" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label text-xs" htmlFor="to">To</label>
          <input id="to" type="date" name="to" defaultValue={to} className="input" />
        </div>
      </FilterBar>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Attendance rate" value={pct(attendanceRate(allForStats))} benchmark={attendanceRate(allForStats)} />
        {Object.entries(ATTENDANCE_LABEL).map(([k, label]) => (
          <StatTile key={k} label={label} value={counts[k] ?? 0} />
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState>No attendance records match these filters.</EmptyState>
      ) : (
        <TableWrap>
          <thead className="border-b border-line bg-cream/60">
            <tr>
              <th className="th">Date</th>
              <th className="th">Team member</th>
              <th className="th">Department / team</th>
              <th className="th">Session</th>
              <th className="th">Status</th>
              <th className="th">Remarks</th>
              <th className="th">Recorded by</th>
              {isManager && <th className="th"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap">{formatDate(r.date)}</td>
                <td className="td">{r.user.name}</td>
                <td className="td">{r.team.name}</td>
                <td className="td">{r.session}</td>
                <td className="td"><Badge tone={ATTENDANCE_TONE[r.status]}>{ATTENDANCE_LABEL[r.status]}</Badge></td>
                <td className="td text-muted">{r.remarks}</td>
                <td className="td text-muted">{r.recordedBy.name}</td>
                {isManager && (
                  <td className="td text-right">
                    {canManageTeam(user, r.teamId) && (
                      <ConfirmButton action={deleteAttendance.bind(null, r.id)} message="Delete this attendance record?" className="text-xs text-red-700 hover:underline">
                        Delete
                      </ConfirmButton>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {rows.length === LIMIT && <p className="mt-2 text-xs text-muted">Showing the latest {LIMIT} records. Narrow the filters to see older ones.</p>}
    </>
  );
}
