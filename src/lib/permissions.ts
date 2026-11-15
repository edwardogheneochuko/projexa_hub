// Role-based access rules (PRD §6, §8). Keep every permission decision in this file.
//
//   FOUNDER  Founders: everything.
//   HEAD     Departmental Lead: their department's analytics, reviews, evaluations, KPIs, attendance and HQ.
//   LEAD     Functional Lead: their department's analytics and submissions, read-only; their own reporting.
//   MEMBER   Team Member: their own reporting and their department's HQ.
//   REP      Alumni / Campus Representative: like a Team Member, only in the Alumni or Campus Structure department.

export type Role = "FOUNDER" | "HEAD" | "LEAD" | "MEMBER" | "REP";
export const ROLE_LABELS: Record<Role, string> = {
  FOUNDER: "Founder",
  HEAD: "Departmental Lead",
  LEAD: "Functional Lead",
  MEMBER: "Team Member",
  REP: "Alumni / Campus Representative",
};
export const ROLES = Object.keys(ROLE_LABELS) as Role[];
/** Representatives can only belong to these departments. */
export const REP_TEAM_SLUGS = ["alumni", "campus-chapter"];

type U = { id: string; role: string; teamId: string | null; canViewFinance: boolean; canViewHR: boolean };

export const isFounder = (u: U) => u.role === "FOUNDER";
export const isHead = (u: U) => u.role === "HEAD";
export const isLead = (u: U) => u.role === "LEAD";
/** Founder, Departmental Lead or Functional Lead: sees department dashboards. */
export const isLeader = (u: U) => isFounder(u) || isHead(u) || isLead(u);

/** Can see a team's analytics dashboard and every member's records in that team (read-only for Functional Leads). */
export function canViewTeamAnalytics(u: U, teamId: string) {
  return isFounder(u) || ((isHead(u) || isLead(u)) && u.teamId === teamId);
}

/** Can record attendance, maintain KPIs, review reports and write evaluations for a team. */
export function canManageTeam(u: U, teamId: string) {
  return isFounder(u) || (isHead(u) && u.teamId === teamId);
}

/** Can view an individual's performance records. */
export function canViewPerson(u: U, target: { id: string; teamId: string | null }) {
  if (u.id === target.id) return true;
  if (isFounder(u)) return true;
  return (isHead(u) || isLead(u)) && target.teamId !== null && target.teamId === u.teamId;
}

/** Team IDs whose records this user can LIST (read). `null` means all teams. */
export function viewTeamIds(u: U): string[] | null {
  if (isFounder(u)) return null;
  if ((isHead(u) || isLead(u)) && u.teamId) return [u.teamId];
  return [];
}

/** Team IDs this user can MANAGE (write). `null` means all teams. */
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
