// Role-based access rules (PRD §8). Keep every permission decision in this file.

export type Role = "FOUNDER" | "HEAD" | "MEMBER";
export const ROLE_LABELS: Record<Role, string> = {
  FOUNDER: "Founder",
  HEAD: "Department Head",
  MEMBER: "Team Member",
};

type U = { id: string; role: string; teamId: string | null; canViewFinance: boolean; canViewHR: boolean };

export const isFounder = (u: U) => u.role === "FOUNDER";
export const isHead = (u: U) => u.role === "HEAD";

/** Can see a team's analytics dashboard and every member's records in that team. */
export function canViewTeamAnalytics(u: U, teamId: string) {
  return isFounder(u) || (isHead(u) && u.teamId === teamId);
}

/** Can record attendance, maintain KPIs, review reports and write evaluations for a team. */
export const canManageTeam = canViewTeamAnalytics;

/** Can view an individual's performance records. */
export function canViewPerson(u: U, target: { id: string; teamId: string | null }) {
  if (u.id === target.id) return true;
  if (isFounder(u)) return true;
  return isHead(u) && target.teamId !== null && target.teamId === u.teamId;
}

/** Team IDs whose records this user can list. `null` means all teams. */
export function managedTeamIds(u: U): string[] | null {
  if (isFounder(u)) return null;
  if (isHead(u) && u.teamId) return [u.teamId];
  return [];
}

/** Team KPI matrix is readable by every member of the team (PRD §8 "permitted KPI information"). */
export function canViewTeamKpis(u: U, teamId: string) {
  return isFounder(u) || u.teamId === teamId;
}

export type Confidential = "finance" | "hr";

export function hasConfidentialAccess(u: U, kind: Confidential) {
  if (isFounder(u)) return true;
  return kind === "finance" ? u.canViewFinance : u.canViewHR;
}
