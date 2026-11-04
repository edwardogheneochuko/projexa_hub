import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { visibleSpaces } from "@/lib/hq";
import { AnalyticsArt, Gateway, GatewayCard, HqArt } from "@/components/gateway";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await requireUser();
  const hasHq = visibleSpaces(user).length > 0;

  return (
    <Gateway
      title="Welcome to Projexa Hub"
      subtitle="Your central space for organizational management, performance tracking, and internal operations."
      prompt="Where would you like to go?"
    >
      <GatewayCard
        title="Projexa Analytics"
        description="Access organizational performance, team activities, alumni, and campus analytics."
        illustration={<AnalyticsArt />}
        action={{ href: "/welcome/analytics", label: "Open Analytics" }}
      />
      <GatewayCard
        title="Company HQ"
        description="Access departmental workspaces, organizational information, plans, and internal resources."
        illustration={<HqArt />}
        action={hasHq ? { href: "/hq", label: "Open HQ" } : null}
        notice={hasHq ? undefined : "You don't have access to any HQ workspace yet."}
      />
    </Gateway>
  );
}
