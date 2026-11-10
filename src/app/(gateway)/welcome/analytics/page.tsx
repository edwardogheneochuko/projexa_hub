import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { liveTeamSlugs, visibleSpaces } from "@/lib/hq";
import { Gateway, SectionCard } from "@/components/gateway";

export const metadata: Metadata = { title: "Projexa Hub Analytics" };

export default async function AnalyticsSelectionPage() {
  const user = await requireUser();
  // The Alumni and Campus Structure sections (PRD §4.3–4.4) are open to whoever can use that HQ workspace.
  const spaces = visibleSpaces(user, await liveTeamSlugs()).map((s) => s.key);
  const alumni = spaces.includes("alumni") ? "/alumni" : null;
  const campus = spaces.includes("campus") ? "/campus" : null;
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
