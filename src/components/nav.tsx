"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type NavGroup = { label: string; items: { href: string; label: string; exact?: boolean }[] };

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">PH</span>
      <span className="leading-tight">
        <span className="block text-sm font-bold text-brand">Projexa Hub</span>
        <span className="block text-xs text-muted">Central</span>
      </span>
    </Link>
  );
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const path = usePathname();
  // Longest matching prefix wins, so /analytics doesn't stay active on /analytics/kpis.
  const all = groups.flatMap((g) => g.items);
  const active = all
    .filter((i) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={onNavigate}
                  aria-current={active === i.href ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-sm",
                    active === i.href ? "bg-accent-soft font-semibold text-brand" : "text-ink hover:bg-cream",
                  )}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppNav({ groups, user, logout }: { groups: NavGroup[]; user: { name: string; roleLabel: string; team: string }; logout: () => Promise<void> }) {
  // Closed by default. The same button opens and closes it, and it stays in place while open.
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-white px-3 print:hidden sm:px-4">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="app-sidebar"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-cream"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <Brand />
      </header>

      {open && (
        <aside id="app-sidebar" className="fixed bottom-0 left-0 top-14 z-30 flex w-full flex-col overflow-y-auto border-r border-line bg-white px-3 py-4 shadow-lg print:hidden sm:w-72">
          <div className="flex-1">
            <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-line pt-3">
            <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-cream">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">
                {user.roleLabel}
                {user.team && ` · ${user.team}`}
              </p>
            </Link>
            <form action={logout}>
              <button className="mt-1 w-full rounded-lg px-3 py-1.5 text-left text-sm text-muted hover:bg-cream hover:text-ink">Sign out</button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
