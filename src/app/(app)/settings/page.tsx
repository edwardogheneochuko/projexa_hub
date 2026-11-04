import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireFounder } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { sp, type SearchParams } from "@/lib/utils";
import { usernameOf } from "@/lib/accounts";
import { formatDate } from "@/lib/periods";
import { Badge, Card, FilterBar, FilterSelect, PageHeader, TableWrap } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { saveTeam } from "./actions";

export const metadata: Metadata = { title: "Settings & permissions" };

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireFounder();
  const params = await searchParams;
  const teamId = sp(params, "team");
  const showInactive = sp(params, "inactive") === "1";
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      where: { ...(teamId ? { teamId } : {}), ...(showInactive ? {} : { active: true }) },
      include: { team: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { members: true } } } }),
  ]);
  const resetRequests = await prisma.user.findMany({
    where: { resetRequestedAt: { not: null }, active: true },
    orderBy: { resetRequestedAt: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Settings & permissions"
        description="Manage accounts, roles, departments and access to confidential Finance and HR information. Confidential access is never granted automatically by department."
        actions={<Link href="/settings/users/new" className="btn-primary">Add person</Link>}
      />
      {resetRequests.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Password reset requests</p>
          <ul className="mt-2 space-y-1 text-sm">
            {resetRequests.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{u.name}</span>
                <span className="text-muted">({usernameOf(u.email)}) asked {formatDate(u.resetRequestedAt!)}</span>
                <Link href={`/settings/users/${u.id}`} className="link">Reset password →</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FilterBar resetHref="/settings">
        <FilterSelect name="team" label="Department / team" value={teamId} allLabel="All" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect name="inactive" label="Show" value={showInactive ? "1" : ""} allLabel="Active accounts" options={[{ value: "1", label: "Active and inactive" }]} />
      </FilterBar>
      <TableWrap>
        <thead className="border-b border-line bg-cream/60">
          <tr>
            <th className="th">Name</th>
            <th className="th">Username</th>
            <th className="th">Sign-in</th>
            <th className="th">Role</th>
            <th className="th">Department / team</th>
            <th className="th">Confidential access</th>
            <th className="th"><span className="sr-only">Edit</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="td font-medium">
                {u.name} {!u.active && <Badge tone="bad">Inactive</Badge>}
                <p className="text-xs font-normal text-muted">{u.position}</p>
              </td>
              <td className="td font-mono text-xs text-muted">{u.email}</td>
              <td className="td">
                {u.resetRequestedAt ? <Badge tone="warn">Reset requested</Badge> : u.passwordHash ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">Not set up</Badge>}
              </td>
              <td className="td">{ROLE_LABELS[u.role as Role]}</td>
              <td className="td">{u.team?.name ?? "—"}</td>
              <td className="td">
                <div className="flex flex-wrap gap-1">
                  {u.role === "FOUNDER" ? <Badge tone="brand">All</Badge> : null}
                  {u.role !== "FOUNDER" && u.canViewFinance && <Badge tone="warn">Finance</Badge>}
                  {u.role !== "FOUNDER" && u.canViewHR && <Badge tone="warn">HR</Badge>}
                  {u.role !== "FOUNDER" && !u.canViewFinance && !u.canViewHR && <span className="text-muted">None</span>}
                </div>
              </td>
              <td className="td"><Link href={`/settings/users/${u.id}`} className="link text-sm">Edit</Link></td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-brand">Departments & teams</h2>
      <p className="mb-4 text-sm text-muted">
        Every team here is tracked in Analytics. HQ workspaces are fixed per department (see the developer handover notes to add one).
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((t) => (
          <Card key={t.id}>
            <ActionForm action={saveTeam.bind(null, t.id)} className="space-y-3">
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <input name="name" defaultValue={t.name} aria-label="Team name" className="input font-semibold" />
                <input name="sortOrder" type="number" defaultValue={t.sortOrder} aria-label="Display order" className="input" />
              </div>
              <textarea name="description" defaultValue={t.description} rows={2} aria-label="Description" className="input" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{t._count.members} people · {t.slug}</span>
                <SubmitButton className="btn-secondary">Save</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ))}
        <Card title="Add a team">
          <ActionForm action={saveTeam.bind(null, null)} className="space-y-3">
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <input name="name" placeholder="Team name" aria-label="Team name" className="input" required />
              <input name="sortOrder" type="number" defaultValue={teams.length + 1} aria-label="Display order" className="input" />
            </div>
            <textarea name="description" rows={2} placeholder="Description" aria-label="Description" className="input" />
            <SubmitButton className="btn-secondary">Add team</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
