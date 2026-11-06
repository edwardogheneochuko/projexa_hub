import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { visibleSpaces } from "@/lib/hq";
import { canViewTeamAnalytics } from "@/lib/permissions";
import { Gateway, SectionCard } from "@/components/gateway";

export const metadata: Metadata = { title: "Projexa Hub Analytics" };

/**
 * Where the Alumni / Campus card's Next button leads for this user:
 * leaders of that team (and the Founder) go to its analytics, members to their own dashboard,
 * and anyone else with the HQ workspace goes there. Otherwise the card is locked.
 */
function destination(user: CurrentUser, team: { id: string; slug: string } | undefined, hqKey: string) {
  if (team && canViewTeamAnalytics(user, team.id)) return `/analytics/teams/${team.slug}`;
  if (team && user.teamId === team.id) return "/analytics";
  return visibleSpaces(user).some((s) => s.key === hqKey) ? `/hq/${hqKey}` : null;
}

export default async function AnalyticsSelectionPage() {
  const user = await requireUser();
  const teams = await prisma.team.findMany({ where: { slug: { in: ["alumni", "campus-chapter"] } }, select: { id: true, slug: true } });
  const alumni = destination(user, teams.find((t) => t.slug === "alumni"), "alumni");
  const campus = destination(user, teams.find((t) => t.slug === "campus-chapter"), "campus");
  const noAccess = "Restricted to the Founder and members of this team.";
  const next = (href: string | null) => (href ? { href, label: "Next" } : null);

  return (
    <Gateway
      wide
      pill="Onboarding"
      title="Welcome to Projexa Hub Analytics"
      subtitle="Explore organizational performance and activities across Projexa Hub"
      prompt="What section would you like to access?"
      back={{ href: "/", label: "Back to home" }}
    >
      <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
        <SectionCard
          title="Projexa Hub Center"
          description="View and manage performance, organizational activities, and internal operations analytics"
          art="center"
          action={next("/welcome/center")}
        />
        <SectionCard
          title="Projexa Alumni"
          description="Access alumni activities, engagement, and performance information"
          art="alumni"
          action={next(alumni)}
          notice={alumni ? undefined : noAccess}
        />
        <SectionCard
          title="Campus Structure"
          description="Access campus chapters, leadership activities, and performance information."
          art="campus"
          action={next(campus)}
          notice={campus ? undefined : noAccess}
        />
      </div>
    </Gateway>
  );
}
