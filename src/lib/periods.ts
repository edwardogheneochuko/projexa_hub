// Reporting-period helpers. Weekly periods use ISO weeks ("2026-W44", Monday–Sunday).
// Monthly periods use "YYYY-MM". Dates are plain "YYYY-MM-DD" strings.

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Today's calendar date as UTC midnight (uses the server's local date). */
export function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const isValidWeek = (p: string) => /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(p);
export const isValidMonth = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDate(s).getTime());

/** Monday of the ISO week. */
export function weekStart(period: string): Date {
  const [y, w] = period.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday1 = addDays(jan4, -((jan4.getUTCDay() || 7) - 1));
  return addDays(monday1, (w - 1) * 7);
}

export function weekRange(period: string): { from: string; to: string } {
  const s = weekStart(period);
  return { from: toDateStr(s), to: toDateStr(addDays(s, 6)) };
}

function shortDate(d: Date) {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function weekLabel(period: string): string {
  const s = weekStart(period);
  const e = addDays(s, 6);
  return `${period.slice(5)} · ${shortDate(s)} – ${shortDate(e)} ${e.getUTCFullYear()}`;
}

export function weekShort(period: string): string {
  return shortDate(weekStart(period));
}

export const currentWeek = () => isoWeek(today());

/** The `n` most recent weeks ending with the current one, oldest first. */
export function recentWeeks(n: number, ref: Date = today()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(isoWeek(addDays(ref, -7 * i)));
  return out;
}

export const currentMonth = () => toDateStr(today()).slice(0, 7);

export function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `${MONTHS_LONG[mo - 1]} ${y}`;
}

/** ISO weeks whose Thursday falls in the month (each week belongs to exactly one month). */
export function weeksOfMonth(m: string): string[] {
  const [y, mo] = m.split("-").map(Number);
  const out: string[] = [];
  let d = new Date(Date.UTC(y, mo - 1, 1));
  while (d.getUTCMonth() === mo - 1) {
    if (d.getUTCDay() === 4) out.push(isoWeek(d));
    d = addDays(d, 1);
  }
  return out;
}

export function recentMonths(n: number): string[] {
  const t = today();
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - i, 1));
    out.push(toDateStr(d).slice(0, 7));
  }
  return out;
}

export function formatDate(s: string | Date): string {
  const d = typeof s === "string" ? parseDate(s) : s;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Select options: next week, this week and the previous `n - 1` weeks, newest first. */
export function weekOptions(n = 12, includeNext = true): { value: string; label: string }[] {
  const weeks = recentWeeks(n).reverse();
  if (includeNext) weeks.unshift(isoWeek(addDays(today(), 7)));
  return weeks.map((w) => ({ value: w, label: weekLabel(w) }));
}

export function monthOptions(n = 12): { value: string; label: string }[] {
  return recentMonths(n).map((m) => ({ value: m, label: monthLabel(m) }));
}
