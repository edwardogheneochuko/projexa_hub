import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn, sp, type SearchParams } from "@/lib/utils";
import { Avatar, Badge, EmptyState, FilterBar, FilterSelect, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Team directory" };

export default async function DirectoryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser();
  const params = await searchParams;
  const q = sp(params, "q").trim();
  const teamId = sp(params, "team");
  const role = sp(params, "role");
  const view = sp(params, "view") === "chart" ? "chart" : "cards";

  const where: Prisma.UserWhereInput = { active: true };
  if (teamId) where.teamId = teamId;
  if (role in ROLE_LABELS) where.role = role;
  if (q) where.OR = [{ name: { contains: q } }, { position: { contains: q } }, { bio: { contains: q } }, { professional: { contains: q } }];

  const [people, teams] = await Promise.all([
    prisma.user.findMany({ where, include: { team: true }, orderBy: [{ name: "asc" }] }),
    prisma.team.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const founders = people.filter((p) => p.role === "FOUNDER");
  const tabHref = (v: string) => `/directory?${new URLSearchParams({ ...(q ? { q } : {}), ...(teamId ? { team: teamId } : {}), ...(role ? { role } : {}), view: v })}`;

  return (
    <>
      <PageHeader title="Team directory" description="Find and connect with colleagues across Projexa Hub." />
      <FilterBar resetHref="/directory">
        <div className="min-w-[180px] flex-1">
          <label className="label text-xs" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, role or skills" className="input" />
        </div>
        <FilterSelect name="team" label="Department" value={teamId} allLabel="All departments" options={teams.map((t) => ({ value: t.id, label: t.name }))} />
        <FilterSelect name="role" label="Role" value={role} allLabel="All roles" options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
        <input type="hidden" name="view" value={view} />
      </FilterBar>

      <div className="mb-4 inline-flex rounded-lg border border-line bg-white p-0.5 text-sm">
        <Link href={tabHref("cards")} className={cn("rounded-md px-3 py-1", view === "cards" ? "bg-brand text-white" : "hover:bg-cream")}>Profiles</Link>
        <Link href={tabHref("chart")} className={cn("rounded-md px-3 py-1", view === "chart" ? "bg-brand text-white" : "hover:bg-cream")}>Organisational chart</Link>
      </div>

      {people.length === 0 ? (
        <EmptyState>No one matches these filters.</EmptyState>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {people.map((p) => (
            <Link key={p.id} href={`/directory/${p.id}`} className="card flex flex-col items-center p-5 text-center transition-colors hover:border-brand-soft">
              <Avatar name={p.name} url={p.avatarUrl} size={72} />
              <p className="mt-3 font-semibold text-ink">{p.name}</p>
              <p className="text-sm text-muted">{p.position || ROLE_LABELS[p.role as Role]}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                {p.team && <Badge tone="brand">{p.team.name}</Badge>}
                {p.role !== "MEMBER" && <Badge>{ROLE_LABELS[p.role as Role]}</Badge>}
              </div>
              {p.bio && <p className="mt-3 line-clamp-2 text-xs text-muted">{p.bio}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {founders.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              {founders.map((f) => (
                <Link key={f.id} href={`/directory/${f.id}`} className="card flex items-center gap-3 border-brand px-4 py-3">
                  <Avatar name={f.name} url={f.avatarUrl} />
                  <span className="text-left">
                    <span className="block font-semibold">{f.name}</span>
                    <span className="block text-xs text-muted">{f.position || "Founder"}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams
              .map((t) => ({ t, members: people.filter((p) => p.teamId === t.id) }))
              .filter((x) => x.members.length > 0)
              .map(({ t, members }) => {
                const heads = members.filter((m) => m.role === "HEAD");
                const rest = members.filter((m) => m.role !== "HEAD");
                return (
                  <div key={t.id} className="card p-4">
                    <h2 className="mb-3 font-semibold text-brand">{t.name}</h2>
                    {heads.map((h) => (
                      <Link key={h.id} href={`/directory/${h.id}`} className="mb-2 flex items-center gap-2 rounded-lg bg-accent-soft p-2">
                        <Avatar name={h.name} url={h.avatarUrl} size={32} />
                        <span>
                          <span className="block text-sm font-semibold">{h.name}</span>
                          <span className="block text-xs text-muted">{h.position || "Department Head"}</span>
                        </span>
                      </Link>
                    ))}
                    <ul className="ml-4 space-y-1 border-l border-line pl-3">
                      {rest.map((m) => (
                        <li key={m.id}>
                          <Link href={`/directory/${m.id}`} className="flex items-center gap-2 rounded p-1 hover:bg-cream">
                            <Avatar name={m.name} url={m.avatarUrl} size={24} />
                            <span className="text-sm">{m.name}</span>
                            <span className="truncate text-xs text-muted">{m.position}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </>
  );
}
