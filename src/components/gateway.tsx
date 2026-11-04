import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shared shell for the entry/selection pages: heading, subtitle and the "where to go" prompt. */
export function Gateway({
  title,
  subtitle,
  prompt,
  back,
  children,
}: {
  title: string;
  subtitle: string;
  prompt: string;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl py-4 sm:py-8">
      {back && (
        <Link href={back.href} className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-brand sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted sm:text-lg">{subtitle}</p>
        <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-accent">{prompt}</p>
      </header>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:auto-cols-fr lg:grid-flow-col">{children}</div>
    </div>
  );
}

type Action = { href: string; label: string };

/**
 * A destination card. When `action` is given the whole card is a link;
 * otherwise it renders as locked with the access notice.
 */
export function GatewayCard({
  title,
  description,
  illustration,
  action,
  secondary,
  notice,
}: {
  title: string;
  description: string;
  illustration: React.ReactNode;
  action?: Action | null;
  secondary?: Action | null;
  notice?: string;
}) {
  const locked = !action;
  return (
    <div
      className={cn(
        "card group relative flex flex-col overflow-hidden transition",
        locked ? "opacity-75" : "hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-lg hover:shadow-brand/5",
      )}
    >
      <div className="flex h-44 items-center justify-center bg-cream/70 px-6">{illustration}</div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold uppercase tracking-wide text-brand">{title}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{description}</p>
        {notice && (
          <p className={cn("mt-4 flex items-center gap-1.5 text-xs font-medium", locked ? "text-red-700" : "text-muted")}>
            <LockIcon /> {notice}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {action ? (
            <Link href={action.href} className="btn-primary after:absolute after:inset-0">
              {action.label} <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="btn-secondary cursor-not-allowed text-muted" aria-disabled>
              No access
            </span>
          )}
          {secondary && (
            <Link href={secondary.href} className="link relative z-10 text-sm">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// ------------------------------------------------------------------ Illustrations
// Simple flat drawings in the brand palette. Decorative, so hidden from screen readers.

const B = "#5b3f2e"; // brand
const S = "#8a6a55"; // brand-soft
const A = "#e07b24"; // accent
const AS = "#fbeedd"; // accent-soft
const L = "#e8e0d3"; // line

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 240 140" className="h-full max-h-36 w-auto" aria-hidden>
      {children}
    </svg>
  );
}

function Person({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="0" cy="-30" r="10" fill={color} />
      <path d="M-17 4 a17 17 0 0 1 34 0 v6 h-34z" fill={color} />
    </g>
  );
}

export function AnalyticsArt() {
  return (
    <Svg>
      <rect x="20" y="14" width="200" height="112" rx="10" fill="#fff" stroke={L} strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <line key={i} x1="38" x2="132" y1={44 + i * 24} y2={44 + i * 24} stroke={L} strokeWidth="1.5" />
      ))}
      <rect x="44" y="76" width="14" height="36" rx="3" fill={S} />
      <rect x="66" y="58" width="14" height="54" rx="3" fill={B} />
      <rect x="88" y="84" width="14" height="28" rx="3" fill={S} />
      <rect x="110" y="40" width="14" height="72" rx="3" fill={A} />
      <polyline points="44,66 73,50 95,62 117,32" fill="none" stroke={B} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="117" cy="32" r="4" fill={A} />
      <circle cx="180" cy="58" r="26" fill={AS} />
      <path d="M180 58 L180 32 A26 26 0 0 1 204 68 Z" fill={A} />
      <path d="M180 58 L204 68 A26 26 0 0 1 162 77 Z" fill={B} />
      <rect x="152" y="96" width="56" height="6" rx="3" fill={L} />
      <rect x="152" y="108" width="36" height="6" rx="3" fill={L} />
    </Svg>
  );
}

export function HqArt() {
  return (
    <Svg>
      <rect x="20" y="122" width="200" height="4" rx="2" fill={L} />
      <rect x="80" y="20" width="80" height="102" rx="4" fill={B} />
      <rect x="40" y="56" width="44" height="66" rx="4" fill={S} />
      <rect x="156" y="46" width="44" height="76" rx="4" fill={S} />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={92 + c * 20} y={30 + r * 16} width="12" height="9" rx="1.5" fill={r === 1 && c === 1 ? A : AS} />),
      )}
      {[0, 1, 2].map((r) => (
        <g key={r}>
          <rect x="50" y={66 + r * 16} width="10" height="8" rx="1.5" fill={AS} />
          <rect x="66" y={66 + r * 16} width="10" height="8" rx="1.5" fill={AS} />
          <rect x="166" y={56 + r * 18} width="10" height="8" rx="1.5" fill={AS} />
          <rect x="182" y={56 + r * 18} width="10" height="8" rx="1.5" fill={AS} />
        </g>
      ))}
      <rect x="111" y="104" width="18" height="18" rx="2" fill={A} />
      <line x1="120" y1="20" x2="120" y2="6" stroke={B} strokeWidth="2" />
      <path d="M120 6 h14 l-4 4 l4 4 h-14z" fill={A} />
      <Person x={28} y={126} color={A} s={0.6} />
      <Person x={214} y={126} color={B} s={0.6} />
    </Svg>
  );
}

export function TeamArt() {
  return (
    <Svg>
      <rect x="40" y="88" width="160" height="10" rx="5" fill={S} />
      <rect x="96" y="56" width="48" height="30" rx="3" fill="#fff" stroke={L} strokeWidth="2" />
      <polyline points="102,78 114,70 124,74 138,62" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" />
      <Person x={60} y={86} color={B} />
      <Person x={180} y={86} color={A} />
      <Person x={120} y={50} color={S} s={0.75} />
      <rect x="56" y="102" width="8" height="24" fill={S} />
      <rect x="176" y="102" width="8" height="24" fill={S} />
      <circle cx="90" cy="26" r="9" fill={AS} />
      <circle cx="152" cy="22" r="6" fill={AS} />
    </Svg>
  );
}

export function AlumniArt() {
  return (
    <Svg>
      <circle cx="120" cy="70" r="54" fill={AS} />
      <Person x={84} y={112} color={S} />
      <Person x={156} y={112} color={S} />
      <Person x={120} y={118} color={B} s={1.15} />
      <g transform="translate(120 38)">
        <path d="M-24 0 L0 -11 L24 0 L0 11 Z" fill={B} />
        <path d="M-13 5 v9 c0 4 26 4 26 0 v-9" fill={B} />
        <line x1="20" y1="2" x2="20" y2="16" stroke={A} strokeWidth="2.5" />
        <circle cx="20" cy="17" r="2.5" fill={A} />
      </g>
      <path d="M200 30 l4 9 l9 1 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6 l9 -1 z" fill={A} />
      <path d="M38 40 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1 z" fill={S} />
    </Svg>
  );
}

export function CampusArt() {
  return (
    <Svg>
      <rect x="20" y="124" width="200" height="4" rx="2" fill={L} />
      <path d="M60 50 L120 20 L180 50 Z" fill={B} />
      <rect x="64" y="50" width="112" height="8" fill={S} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={72 + i * 22} y="60" width="8" height="46" fill={L} />
      ))}
      <rect x="60" y="106" width="120" height="8" fill={S} />
      <circle cx="120" cy="38" r="6" fill={A} />
      <Person x={36} y={126} color={A} s={0.7} />
      <Person x={204} y={126} color={B} s={0.7} />
      <Person x={120} y={126} color={A} s={0.55} />
      <rect x="190" y="104" width="12" height="14" rx="2" fill={A} />
    </Svg>
  );
}

export function FoundersArt() {
  return (
    <Svg>
      <rect x="30" y="16" width="180" height="108" rx="10" fill="#fff" stroke={L} strokeWidth="2" />
      <rect x="30" y="16" width="180" height="20" rx="10" fill={B} />
      <rect x="30" y="28" width="180" height="8" fill={B} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={44 + i * 54} y="46" width="44" height="26" rx="4" fill={i === 1 ? AS : "#fff"} stroke={L} strokeWidth="1.5" />
          <rect x={50 + i * 54} y="52" width="18" height="4" rx="2" fill={S} />
          <rect x={50 + i * 54} y="60" width="28" height="6" rx="3" fill={i === 1 ? A : B} />
        </g>
      ))}
      <polyline points="46,110 76,96 104,102 134,86 164,90 194,78" fill="none" stroke={A} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="194" cy="78" r="4" fill={A} />
      <g transform="translate(196 22)">
        <path d="M-9 4 l3 -10 l6 6 l6 -6 l3 10 z" fill={A} />
      </g>
    </Svg>
  );
}

export function TeamDashboardArt() {
  return (
    <Svg>
      <rect x="30" y="16" width="180" height="108" rx="10" fill="#fff" stroke={L} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="52" cy={38 + i * 24} r="8" fill={i % 2 ? S : B} />
          <rect x="68" y={34 + i * 24} width="56" height="8" rx="4" fill={L} />
          <rect x="136" y={34 + i * 24} width={[48, 36, 52, 24][i]} height="8" rx="4" fill={[A, S, A, L][i]} />
          {i < 3 && <line x1="44" x2="196" y1={50 + i * 24} y2={50 + i * 24} stroke={L} strokeWidth="1" />}
        </g>
      ))}
    </Svg>
  );
}
