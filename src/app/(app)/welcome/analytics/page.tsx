import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { visibleSpaces } from "@/lib/hq";
import { canViewTeamAnalytics } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/auth";
import { AlumniArt, CampusArt, Gateway, GatewayCard, TeamArt } from "@/components/gateway";

export const metadata: Metadata = { title: "Projexa Hub Analytics" };

/**
 * Where the Alumni / Campus card leads for this user:
 * - leaders of that team (and the Founder) go to its analytics dashboard;
 * - members of that team go to their own dashboard;
 * - anyone with the HQ workspace gets a link to it as well.
 */
function destinations(user: CurrentUser, team: { id: string; slug: string } | null, hqKey: string, hqLabel: string) {
  let action: { href: string; label: string } | null = null;
  if (team && canViewTeamAnalytics(user, team.id)) action = { href: `/analytics/teams/${team.slug}`, label: "View analytics" };
  else if (team && user.teamId === team.id) action = { href: "/analytics", label: "My performance" };

  const hq = visibleSpaces(user).some((s) => s.key === hqKey) ? { href: `/hq/${hqKey}`, label: hqLabel } : null;
  // If analytics isn't available but the HQ workspace is, make the workspace the main action.
  if (!action && hq) return { action: { ...hq, label: "Open workspace" }, secondary: null };
  return { action, secondary: hq };
}

export default async function AnalyticsSelectionPage() {
  const user = await requireUser();
  const teams = await prisma.team.findMany({ where: { slug: { in: ["alumni", "campus-chapter"] } }, select: { id: true, slug: true } });
  const alumni = destinations(user, teams.find((t) => t.slug === "alumni") ?? null, "alumni", "Alumni workspace");
  const campus = destinations(user, teams.find((t) => t.slug === "campus-chapter") ?? null, "campus", "Campus workspace");
  const noAccess = "Restricted to the Founder and members of this team.";

  return (
    <Gateway
      title="Welcome to Projexa Hub Analytics"
      subtitle="Explore organizational performance and activities across Projexa Hub."
      prompt="Which section would you like to access?"
      back={{ href: "/", label: "Back to home" }}
    >
      <GatewayCard
        title="Projexa Hub Center"
        description="View and manage team performance, organizational activities, and internal operations analytics."
        illustration={<TeamArt />}
        action={{ href: "/welcome/center", label: "Enter Center" }}
      />
      <GatewayCard
        title="Alumni"
        description="Access alumni activities, engagement, and performance information."
        illustration={<AlumniArt />}
        action={alumni.action}
        secondary={alumni.secondary}
        notice={alumni.action ? undefined : noAccess}
      />
      <GatewayCard
        title="Campus Structure"
        description="Access campus chapters, leadership activities, and performance information."
        illustration={<CampusArt />}
        action={campus.action}
        secondary={campus.secondary}
        notice={campus.action ? undefined : noAccess}
      />
    </Gateway>
  );
}
