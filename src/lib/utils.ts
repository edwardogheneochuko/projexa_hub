export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function pct(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? "—" : `${v.toFixed(digits)}%`;
}

export function naira(v: number): string {
  return `₦${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Read a single string search param. */
export function sp(params: Record<string, string | string[] | undefined>, key: string): string {
  const v = params[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function splitLinks(s: string): string[] {
  return s
    .split(/\s*\n\s*/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Result shape for form server actions used with <ActionForm>. */
export type ActionResult = { error?: string; ok?: string } | undefined;
