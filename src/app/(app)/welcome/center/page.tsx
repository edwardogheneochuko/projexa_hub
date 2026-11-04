import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { isFounder, isHead } from "@/lib/permissions";
import { FoundersArt, Gateway, GatewayCard, TeamDashboardArt } from "@/components/gateway";

export const metadata: Metadata = { title: "Projexa Hub Center" };

export default async function CenterSelectionPage() {
  const user = await requireUser();
  const founder = isFounder(user);

  // Founders see the all-teams comparison; heads see their department; members see their own performance.
  const teamAction = founder
    ? { href: "/analytics/teams", label: "Open Team Dashboard" }
    : user.teamId
      ? { href: "/analytics", label: isHead(user) ? "Open my department" : "Open my dashboard" }
      : null;

  return (
    <Gateway
      title="Welcome to Projexa Hub Center"
      subtitle="Manage and monitor team activities and organizational performance."
      prompt="What would you like to access?"
      back={{ href: "/welcome/analytics", label: "Back to Analytics" }}
    >
      <GatewayCard
        title="Founders Dashboard"
        description="View overall team performance, weekly and monthly evaluations, and organizational activity reports."
        illustration={<FoundersArt />}
        action={founder ? { href: "/analytics", label: "Open Founders Dashboard" } : null}
        notice="Restricted to authorized founders."
      />
      <GatewayCard
        title="Team Dashboard"
        description="Access individual and departmental weekly performance submissions, performance benchmarks, and evaluations."
        illustration={<TeamDashboardArt />}
        action={teamAction}
        secondary={user.teamId ? { href: "/analytics/reports/submit", label: "Submit weekly report" } : null}
        notice="For authorized team members and departmental leads."
      />
    </Gateway>
  );
}
