import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, type Role, isFounder, isHead } from "@/lib/permissions";
import { visibleSpaces } from "@/lib/hq";
import { AppNav, type NavGroup } from "@/components/nav";
import { logout } from "../auth-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const leader = isFounder(user) || isHead(user);

  const groups: NavGroup[] = [
    {
      label: "Start",
      items: [{ href: "/", label: "Home", exact: true }],
    },
    {
      label: "Analytics",
      items: [
        { href: "/analytics", label: "Dashboard", exact: true },
        ...(isFounder(user) ? [{ href: "/analytics/teams", label: "Teams" }] : []),
        { href: "/analytics/attendance", label: "Attendance" },
        { href: "/analytics/kpis", label: "KPI matrix" },
        { href: "/analytics/reports", label: "Weekly reports" },
        { href: "/analytics/evaluations", label: "Monthly evaluations" },
        ...(leader ? [{ href: "/analytics/insights", label: "Performance reports" }] : []),
      ],
    },
    {
      label: "HQ",
      items: [
        { href: "/hq", label: "HQ home", exact: true },
        ...visibleSpaces(user).map((s) => ({ href: `/hq/${s.key}`, label: s.title })),
      ],
    },
    {
      label: "People",
      items: [
        { href: "/directory", label: "Team directory" },
        { href: "/profile", label: "My profile" },
        ...(isFounder(user) ? [{ href: "/settings", label: "Settings & permissions" }] : []),
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <AppNav groups={groups} logout={logout} user={{ name: user.name, roleLabel: ROLE_LABELS[user.role as Role], team: user.team?.name ?? "" }} />
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
