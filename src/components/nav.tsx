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
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  const footer = (
    <div className="border-t border-line pt-3">
      <Link href="/profile" className="block rounded-lg px-3 py-2 hover:bg-cream">
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
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-white px-3 py-4 lg:flex">
        <div className="mb-6 px-2">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks groups={groups} />
        </div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-2.5 lg:hidden">
        <Brand />
        <button
          type="button"
          className="btn-secondary px-3 py-1.5"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && (
        <div id="mobile-nav" className="fixed inset-0 top-[57px] z-20 flex flex-col overflow-y-auto bg-white px-3 py-4 lg:hidden">
          <div className="flex-1">
            <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
          </div>
          {footer}
        </div>
      )}
    </>
  );
}
