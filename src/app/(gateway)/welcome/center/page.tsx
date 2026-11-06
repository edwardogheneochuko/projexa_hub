import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isFounder } from "@/lib/permissions";
import { AccessCard, Gateway } from "@/components/gateway";

export const metadata: Metadata = { title: "Projexa Hub Center" };

export default async function CenterSelectionPage() {
  const user = await requireUser();
  const founder = isFounder(user);

  // Founders see the all-teams comparison; heads see their department; members see their own performance.
  const teamHref = founder ? "/analytics/teams" : user.teamId ? "/analytics" : null;

  return (
    <Gateway
      pill="Onboarding"
      title="Welcome to Projexa Hub Center"
      subtitle="Manage and monitor team activities and organizational performance"
      prompt="What would you like to access?"
      back={{ href: "/welcome/analytics", label: "Back" }}
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:gap-16">
        <AccessCard
          title="Founders Dashboard"
          description="View overall team performance, weekly and monthly evaluations, and organizational activity report."
          notice="Restricted to authorized founders"
          action={founder ? { href: "/analytics", label: "Open Founders Dashboard" } : null}
        />
        <AccessCard
          title="Team Dashboard"
          description="Access individual and departmental weekly performance submissions, performance benchmarks, and evaluations."
          notice="For authorized team members and departmental leads"
          action={teamHref ? { href: teamHref, label: "Open Team Dashboard" } : null}
        />
      </div>
    </Gateway>
  );
}
