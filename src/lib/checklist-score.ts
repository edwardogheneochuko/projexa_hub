// Weekly checklist scoring (PRD §4.2). Pure functions, safe in the browser (live preview) and on the
// server (the stored score is always recalculated on the server).

export const MAX_ITEMS = 12;
export const DEFAULT_BENCHMARK = 80;

export type Method = "YESNO" | "TARGET" | "SCALE";
export const METHODS: Record<Method, { label: string; help: string }> = {
  YESNO: { label: "Done / Not done", help: "Done = 100%, not done = 0%." },
  TARGET: { label: "Number against a target", help: "Actual ÷ target, capped at 100% (e.g. 4 of 5 posts = 80%)." },
  SCALE: { label: "Rating 1–5", help: "1 = 20%, 2 = 40%, 3 = 60%, 4 = 80%, 5 = 100%." },
};

export type ScoredItem = { method: string; target: number | null; weight: number };

/** Score (0–100) for one answer, or null if the answer isn't valid for the method. */
export function itemScore(item: ScoredItem, value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  switch (item.method) {
    case "YESNO":
      return value === 1 ? 100 : value === 0 ? 0 : null;
    case "TARGET":
      if (value < 0 || !item.target || item.target <= 0) return null;
      return Math.min(value / item.target, 1) * 100;
    case "SCALE":
      return Number.isInteger(value) && value >= 1 && value <= 5 ? value * 20 : null;
    default:
      return null;
  }
}

/** Weighted average of item scores (0–100). */
export function overallScore(scored: { score: number; weight: number }[]): number | null {
  const total = scored.reduce((s, x) => s + x.weight, 0);
  if (!scored.length || total <= 0) return null;
  return scored.reduce((s, x) => s + x.score * x.weight, 0) / total;
}

/** PRD §4.1.2 performance status. */
export function performanceStatus(score: number | null | undefined, benchmark: number | null | undefined) {
  if (score === null || score === undefined) return null;
  return score >= (benchmark ?? DEFAULT_BENCHMARK) ? "On Track" : "Needs Improvement";
}
