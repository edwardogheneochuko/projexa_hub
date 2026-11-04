// Pure KPI/benchmark helpers (safe to import from client and server code).
export const BENCHMARK = 80;

export type KpiStatus = "PENDING" | "ACHIEVED" | "ON_TRACK" | "BELOW";

export function kpiAchievement(k: { target: number; actual: number | null }): number | null {
  if (k.actual === null || k.actual === undefined || !(k.target > 0)) return null;
  return (k.actual / k.target) * 100;
}

export function kpiStatus(k: { target: number; actual: number | null }): KpiStatus {
  const a = kpiAchievement(k);
  if (a === null) return "PENDING";
  if (a >= 100) return "ACHIEVED";
  if (a >= BENCHMARK) return "ON_TRACK";
  return "BELOW";
}
