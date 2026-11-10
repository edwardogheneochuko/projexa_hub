import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, type Role, isFounder, isHead, managedTeamIds } from "@/lib/permissions";
import { AppShell, type NavGroup, type NavItem } from "@/components/nav";
import { logout } from "../auth-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const founder = isFounder(user);
  const leader = founder || isHead(user);

  // Main navigation follows the Figma dashboards. Day-to-day tools stay reachable under "Tools".
  const main: NavGroup[] = [
    {
      items: leader
        ? [
            { href: "/dashboard", label: "Team Overview", icon: "overview", exact: true },
            { href: "/dashboard/reviews", label: "Team Reviews", icon: "reviews" },
            { href: "/dashboard/reports", label: "Performance Reviews", icon: "reports" },
          ]
        : [
            { href: "/analytics", label: "My Performance", icon: "overview", exact: true },
            { href: "/analytics/reports", label: "Weekly Reports", icon: "reports" },
            { href: "/analytics/evaluations", label: "My Evaluations", icon: "reviews" },
          ],
    },
    {
      label: "Tools",
      items: [
        { href: "/analytics/attendance", label: "Attendance", icon: "attendance" },
        { href: "/analytics/kpis", label: "KPI Matrix", icon: "kpi" },
        ...(leader
          ? ([
              { href: "/analytics/reports", label: "Weekly Reports", icon: "evaluations" },
              { href: "/analytics/evaluations", label: "Evaluations", icon: "evaluations" },
            ] satisfies NavItem[])
          : []),
        { href: "/hq", label: "Company HQ", icon: "hq" },
        { href: "/directory", label: "Team Directory", icon: "directory" },
      ],
    },
  ];
  const bottom: NavItem[] = [
    { href: founder ? "/settings" : "/profile", label: "Settings", icon: "settings" },
    { href: "mailto:info.projexahub@gmail.com?subject=Projexa%20Hub%20Central%20help", label: "Help & Support", icon: "help" },
  ];

  // Bell: weekly reports waiting for review in the teams this person manages.
  const managed = managedTeamIds(user);
  const pending = leader
    ? await prisma.weeklyReport.count({ where: { status: "SUBMITTED", ...(managed === null ? {} : { teamId: { in: managed } }) } })
    : 0;

  return (
    <AppShell
      main={main}
      bottom={bottom}
      user={{ name: user.name, roleLabel: founder ? "Founder/ Administrator" : `${ROLE_LABELS[user.role as Role]}${user.team ? ` · ${user.team.name}` : ""}`, avatarUrl: user.avatarUrl }}
      logout={logout}
      search={leader ? { action: "/dashboard", placeholder: "Search team members…" } : { action: "/directory", placeholder: "Search the directory…" }}
      settingsHref={founder ? "/settings" : "/profile"}
      alerts={leader ? { href: "/dashboard/reports?status=SUBMITTED", count: pending } : null}
    >
      {children}
    </AppShell>
  );
}
