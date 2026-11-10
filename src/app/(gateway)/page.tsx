import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { liveTeamSlugs, visibleSpaces } from "@/lib/hq";
import { Gateway, TiltCard } from "@/components/gateway";

export const metadata: Metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const user = await requireUser();
  const hasHq = visibleSpaces(user, await liveTeamSlugs()).length > 0;

  return (
    <Gateway
      title={<>Welcome to Projexa Hub<br />Operations Site</>}
      subtitle="Your central space for organizational management, performance tracking, and internal operations"
      prompt="Where would you like to go?"
    >
      <div className="flex flex-col items-center justify-center gap-10 sm:flex-row sm:items-stretch sm:gap-8 lg:gap-14">
        <TiltCard
          tilt="left"
          title={<>Projexa<br />Analytics</>}
          description="Access organizational performance, team activities, alumni, and campus activities"
          art="analytics"
          action={{ href: "/welcome/analytics", label: "Open" }}
        />
        <TiltCard
          tilt="right"
          title={<>Company<br />HQ</>}
          description="Access departmental workspaces, organizational information, plans and internal resource"
          art="hq"
          action={hasHq ? { href: "/hq", label: "Open" } : null}
          notice={hasHq ? undefined : "You don't have access to any HQ workspace yet."}
        />
      </div>
    </Gateway>
  );
}
