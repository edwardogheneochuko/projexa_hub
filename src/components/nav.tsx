"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type IconName = "overview" | "reviews" | "reports" | "attendance" | "kpi" | "evaluations" | "hq" | "directory" | "settings" | "help" | "home";
export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

const ICONS: Record<IconName, React.ReactNode> = {
  overview: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor" stroke="none" />,
  reviews: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 11l2 2 4-4" /></>,
  reports: <><path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3z" /><path d="M21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" /></>,
  attendance: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" /></>,
  kpi: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  evaluations: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 14h8M8 18h5" /></>,
  hq: <><path d="M4 21V8l8-5 8 5v13" /><path d="M9 21v-6h6v6" /></>,
  directory: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><path d="M17 4.5a3.5 3.5 0 0 1 0 7M22 20c0-2.6-1.7-4.8-4-5.6" /></>,
  settings: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  help: <><path d="M4 9v6h4l6 4V5L8 9z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      {ICONS[name]}
    </svg>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center justify-center gap-2.5 py-1" aria-label="Projexa Hub home">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black font-display text-sm font-bold text-white">PH</span>
      <span className="font-display text-sm font-semibold tracking-widest text-black">PROJEXA HUB</span>
    </Link>
  );
}

function NavList({ groups, active, onNavigate }: { groups: NavGroup[]; active?: string; onNavigate: () => void }) {
  return (
    <div className="space-y-6">
      {groups.map((g, i) => (
        <div key={g.label ?? i}>
          {g.label && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">{g.label}</p>}
          <ul className="space-y-1">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={onNavigate}
                  aria-current={active === it.href ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm tracking-wide text-black transition-colors",
                    active === it.href ? "bg-[#f0f0f0] font-medium" : "hover:bg-[#f5f5f5]",
                  )}
                >
                  <Icon name={it.icon} />
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type User = { name: string; roleLabel: string; avatarUrl: string };

/**
 * App frame from the Figma dashboards: white sidebar (always open on desktop; on phones and tablets it is
 * closed and one button opens and closes it) and a top bar with search, settings, notifications and avatar.
 */
export function AppShell({
  main,
  bottom,
  user,
  logout,
  search,
  settingsHref,
  alerts,
  children,
}: {
  main: NavGroup[];
  bottom: NavItem[];
  user: User;
  logout: () => Promise<void>;
  search: { action: string; placeholder: string };
  settingsHref: string;
  alerts: { href: string; count: number } | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  // Longest matching link wins, so /dashboard isn't also active on /dashboard/reviews.
  const all = [...main.flatMap((g) => g.items), ...bottom];
  const active = all
    .filter((i) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <aside
        id="app-sidebar"
        className={cn(
          "fixed bottom-0 left-0 top-0 z-40 w-72 flex-col overflow-y-auto border-r border-[#e5e5e5] bg-white px-4 pb-4 pt-24 print:hidden lg:flex lg:w-64 lg:pt-6",
          open ? "flex shadow-xl" : "hidden",
        )}
      >
        <Logo />
        <nav aria-label="Main" className="mt-8 flex-1">
          <NavList groups={main} active={active} onNavigate={close} />
        </nav>
        <nav aria-label="Account" className="mt-8">
          <NavList groups={[{ items: bottom }]} active={active} onNavigate={close} />
        </nav>
        <div className="mt-6 space-y-3">
          <Link href="/profile" onClick={close} className="flex items-center gap-3 rounded-xl border border-[#ececec] px-3 py-2.5 hover:bg-[#f7f7f7]">
            <Avatar user={user} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm tracking-wide text-black">{user.name}</span>
              <span className="block truncate text-xs tracking-wide text-neutral-600">{user.roleLabel}</span>
            </span>
            <span aria-hidden className="text-neutral-500">›</span>
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f0f0f0] px-3 py-2.5 text-sm tracking-wide text-black hover:bg-[#e5e5e5]">
              Log out
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-50 bg-[#f5f5f5]/95 px-3 pt-3 backdrop-blur print:hidden sm:px-6 sm:pt-4 lg:px-8">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 sm:gap-3 sm:px-4">
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="app-sidebar"
              onClick={() => setOpen((o) => !o)}
              className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black hover:bg-[#f3f3f3] lg:hidden")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <form action={search.action} role="search" className="min-w-0 flex-1 sm:max-w-sm">
              <label className="flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-4 py-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
                <span className="sr-only">Search</span>
                <input name="q" type="search" placeholder={search.placeholder} className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-neutral-500" />
              </label>
            </form>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link href={settingsHref} aria-label="Settings" className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 hover:bg-[#f3f3f3]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
              </Link>
              {alerts && (
                <Link
                  href={alerts.href}
                  aria-label={alerts.count ? `${alerts.count} reports waiting for review` : "No reports waiting for review"}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 hover:bg-[#f3f3f3]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
                  {alerts.count > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-black" />}
                </Link>
              )}
              <Link href="/profile" aria-label="My profile" className="ml-1 rounded-full">
                <Avatar user={user} size={36} />
              </Link>
            </div>
          </div>
        </header>
        <main className="px-3 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Avatar({ user, size }: { user: User; size: number }) {
  if (user.avatarUrl) {
    // External profile-picture link (no uploads).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full border border-[#e5e5e5] object-cover" style={{ width: size, height: size }} />;
  }
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#e5e5e5] font-medium text-neutral-700" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
}
