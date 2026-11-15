"use client";

// Sorting and searching for every table (PRD §7.5). Wraps an ordinary <thead>/<tbody> rendered on the
// server: headings become sort buttons and a search box filters the rows, without changing each page.
// For paginated tables pass `server`: headings then re-sort the whole list via the URL (?sort=&dir=).
import { Children, cloneElement, isValidElement, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = { children?: ReactNode; className?: string };
const elements = (n: ReactNode) => Children.toArray(n).filter(isValidElement) as ReactElement<Props>[];

/** Visible text of a server-rendered cell (a `data-sort` attribute wins when present). */
function textOf(n: ReactNode): string {
  if (n === null || n === undefined || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join(" ");
  if (isValidElement(n)) {
    const p = n.props as Record<string, unknown>;
    if (p["data-sort"] !== undefined) return String(p["data-sort"]);
    // Decorative bits (avatar initials, icons) aren't part of the value.
    if (p["aria-hidden"] === true || p["aria-hidden"] === "true") return "";
    return textOf(p.children as ReactNode);
  }
  return "";
}

/** Numbers, percentages, money and dates sort as values; "—" and blanks always go last. */
function sortKey(text: string): { empty: boolean; num?: number; str: string } {
  const t = text.trim();
  if (!t || t === "—") return { empty: true, str: "" };
  const n = t.replace(/[%₦,\s]/g, "");
  if (/^-?\d+(\.\d+)?$/.test(n)) return { empty: false, num: Number(n), str: t };
  if (/^\d{1,2} [A-Z][a-z]{2,8} \d{4}$/.test(t)) {
    const d = Date.parse(t);
    if (!isNaN(d)) return { empty: false, num: d, str: t };
  }
  return { empty: false, str: t.toLowerCase() };
}

function compare(a: string, b: string) {
  const x = sortKey(a);
  const y = sortKey(b);
  if (x.empty || y.empty) return x.empty === y.empty ? 0 : x.empty ? 1 : -1;
  if (x.num !== undefined && y.num !== undefined) return x.num - y.num;
  return x.str.localeCompare(y.str, undefined, { numeric: true });
}

export type ServerSort = { keys: (string | null)[]; sort: string; dir: "asc" | "desc" };

export function SmartTable({
  children,
  wrapperClassName,
  tableClassName,
  tableStyle,
  server,
  searchable = true,
}: {
  children: ReactNode;
  wrapperClassName?: string;
  tableClassName?: string;
  tableStyle?: React.CSSProperties;
  /** Paginated tables: sort on the server via ?sort=&dir= instead of within the page. */
  server?: ServerSort;
  searchable?: boolean;
}) {
  const parts = elements(children);
  const thead = parts.find((e) => e.type === "thead");
  const tbody = parts.find((e) => e.type === "tbody");
  const headRow = thead ? elements(thead.props.children)[0] : undefined;
  const headCells = headRow ? elements(headRow.props.children) : [];
  const allRows = tbody ? elements(tbody.props.children) : [];

  // Rows with a single wide cell (e.g. "No records") aren't data.
  const isData = (r: ReactElement<Props>) => {
    const cells = elements(r.props.children);
    return !(cells.length === 1 && (cells[0].props as Record<string, unknown>).colSpan);
  };
  const dataRows = allRows.filter(isData);
  const otherRows = allRows.filter((r) => !isData(r));
  const rowCells = useMemo(() => dataRows.map((r) => elements(r.props.children).map((c) => textOf(c))), [dataRows]);

  const [sort, setSort] = useState<{ col: number; dir: "asc" | "desc" } | null>(null);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();

  let order = dataRows.map((_, i) => i);
  const q = query.trim().toLowerCase();
  if (q) order = order.filter((i) => rowCells[i].join(" ").toLowerCase().includes(q));
  if (sort && !server) {
    order = [...order].sort((a, b) => {
      const c = compare(rowCells[a][sort.col] ?? "", rowCells[b][sort.col] ?? "");
      return sort.dir === "asc" ? c : -c;
    });
  }

  const headerLabel = (cell: ReactElement<Props>) => textOf(cell.props.children).trim();
  const clickHeader = (i: number) => {
    if (server) {
      const key = server.keys[i];
      if (!key) return;
      const next = new URLSearchParams(params.toString());
      const dir = server.sort === key && server.dir === "asc" ? "desc" : "asc";
      next.set("sort", key);
      next.set("dir", dir);
      next.delete("page");
      router.push(`${path}?${next}`, { scroll: false });
      return;
    }
    setSort((s) => (s?.col === i ? { col: i, dir: s.dir === "asc" ? "desc" : "asc" } : { col: i, dir: "asc" }));
  };
  const state = (i: number): "ascending" | "descending" | undefined => {
    if (server) return server.keys[i] && server.sort === server.keys[i] ? (server.dir === "asc" ? "ascending" : "descending") : undefined;
    return sort?.col === i ? (sort.dir === "asc" ? "ascending" : "descending") : undefined;
  };
  const sortable = (i: number, cell: ReactElement<Props>) => (server ? !!server.keys[i] : headerLabel(cell) !== "");

  const head =
    thead && headRow
      ? cloneElement(thead, {}, cloneElement(headRow, {}, headCells.map((cell, i) => {
          if (!sortable(i, cell)) return cloneElement(cell, { key: i });
          const s = state(i);
          return cloneElement(
            cell,
            { key: i, "aria-sort": s ?? "none" } as Props,
            <button type="button" onClick={() => clickHeader(i)} className="inline-flex items-center gap-1 text-left hover:underline" title="Sort by this column">
              {cell.props.children}
              <span aria-hidden className="text-[10px] opacity-60">{s === "ascending" ? "▲" : s === "descending" ? "▼" : "↕"}</span>
            </button>,
          );
        })))
      : null;

  const shown = order.map((i) => dataRows[i]);
  const body = tbody
    ? cloneElement(
        tbody,
        {},
        shown.length ? shown : q && dataRows.length ? (
          <tr key="no-match">
            <td colSpan={Math.max(headCells.length, 1)} className="px-4 py-8 text-center text-sm text-muted">
              No rows match “{query}”.
            </td>
          </tr>
        ) : null,
        !q ? otherRows : null,
      )
    : null;

  return (
    <div className="min-w-0">
      {searchable && !server && dataRows.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search this table</span>
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this table…" className="input pl-9" />
          </label>
          {q && <span className="text-xs text-muted">Showing {shown.length} of {dataRows.length}</span>}
        </div>
      )}
      <div className={cn("overflow-x-auto", wrapperClassName)}>
        <table className={tableClassName} style={tableStyle}>
          {head}
          {body}
        </table>
      </div>
    </div>
  );
}
