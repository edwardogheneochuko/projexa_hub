import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Action = { href: string; label: string };

// Pixel sizes of the illustrations in public/gateway. Decorative, so their alt text is empty.
const ART = {
  analytics: { width: 488, height: 282 },
  hq: { width: 488, height: 282 },
  center: { width: 448, height: 270 },
  alumni: { width: 442, height: 360 },
  campus: { width: 485, height: 254 },
};
export type ArtName = keyof typeof ART;

const CARD_BG = "bg-[#f3f3f3]";
const CONTROL = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#e5e5e5] font-semibold tracking-wide text-black transition-colors hover:bg-[#d9d9d9]";
const LOCKED = "inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-[#e5e5e5] font-semibold tracking-wide text-neutral-500";

/** Shared shell for the entry/selection pages: logo, heading, subtitle and the "where to go" prompt. */
export function Gateway({
  title,
  subtitle,
  prompt,
  pill,
  back,
  wide,
  children,
}: {
  title: React.ReactNode;
  subtitle: string;
  prompt: string;
  pill?: string;
  back?: Action;
  /** Three-card page: uses more of the screen width. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black font-display text-sm font-bold text-white">PH</span>
          <span className="font-display text-sm font-semibold tracking-widest text-black">PROJEXA HUB</span>
        </span>
      </div>
      <header className="mt-6 text-center">
        {pill && (
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#e5e5ea] px-4 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-neutral-700">
            <span aria-hidden className="h-2 w-2 rounded-full bg-neutral-400" /> {pill}
          </span>
        )}
        <h1 className="font-display text-2xl font-bold tracking-wide text-black sm:text-4xl lg:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm tracking-[0.08em] text-black sm:text-base lg:text-lg">{subtitle}</p>
        <p className="mt-8 font-display text-lg tracking-wide text-black underline underline-offset-[6px] sm:mt-12 sm:text-2xl lg:text-3xl">{prompt}</p>
      </header>
      <div className={cn("mx-auto mt-8 sm:mt-12", wide ? "max-w-[1400px]" : "max-w-6xl")}>
        {children}
        {back && (
          <div className="mt-8 sm:mt-12">
            <Link href={back.href} className={cn(CONTROL, "px-5 py-3 text-sm sm:text-base")}>
              <span aria-hidden>←</span> {back.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function NoAccess({ notice }: { notice: string }) {
  return <p className="mt-3 text-xs font-medium tracking-wide text-neutral-600">{notice}</p>;
}

/** Welcome page card: tilted, picture on top, round arrow in the corner. The whole card is the link. */
export function TiltCard({
  title,
  description,
  art,
  action,
  tilt,
  notice,
}: {
  title: React.ReactNode;
  description: string;
  art: ArtName;
  action: Action | null;
  tilt: "left" | "right";
  notice?: string;
}) {
  const className = cn(
    "group relative flex w-full max-w-md flex-col rounded-3xl p-4 transition-shadow sm:p-5",
    CARD_BG,
    tilt === "left" ? "-rotate-3" : "rotate-3",
    action ? "hover:shadow-lg" : "opacity-75",
  );
  const body = (
    <>
      <Image src={`/gateway/${art}.png`} alt="" {...ART[art]} className="h-auto w-full rounded-2xl" />
      <h2 className="mt-6 px-2 font-display text-xl font-medium uppercase tracking-wide text-black lg:text-2xl">{title}</h2>
      <p className="mt-4 flex-1 px-2 pb-12 text-sm leading-relaxed tracking-[0.08em] text-black lg:text-base">{description}</p>
      {notice && <NoAccess notice={notice} />}
      {action && (
        <span aria-hidden className="absolute bottom-5 right-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#333] text-lg text-white transition-colors group-hover:bg-black">
          →
        </span>
      )}
    </>
  );
  return action ? (
    <Link href={action.href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Analytics selection card: title, text, picture, then a small Next button. The whole card is clickable. */
export function SectionCard({
  title,
  description,
  art,
  action,
  notice,
}: {
  title: string;
  description: string;
  art: ArtName;
  action: Action | null;
  notice?: string;
}) {
  return (
    <div className={cn("relative flex flex-col rounded-3xl p-6 transition-shadow lg:p-8", CARD_BG, action ? "hover:shadow-lg" : "opacity-75")}>
      <h2 className="font-display text-xl font-semibold tracking-wide text-black lg:text-2xl">{title}</h2>
      <p className="mt-4 text-sm leading-relaxed tracking-[0.08em] text-black lg:text-base">{description}</p>
      <div className="my-6 flex flex-1 items-center justify-center">
        <Image src={`/gateway/${art}.png`} alt="" {...ART[art]} className="h-auto max-h-64 w-auto max-w-full" />
      </div>
      {notice && <NoAccess notice={notice} />}
      <div className="mt-2 flex justify-end">
        {action ? (
          <Link
            href={action.href}
            aria-label={`${action.label}: ${title}`}
            className={cn(CONTROL, "px-6 py-3 text-sm after:absolute after:inset-0 after:rounded-3xl after:content-[''] lg:text-base")}
          >
            {action.label} <span aria-hidden>→</span>
          </Link>
        ) : (
          <span className={cn(LOCKED, "px-6 py-3 text-sm")} aria-disabled>
            No access
          </span>
        )}
      </div>
    </div>
  );
}

/** Center selection card: title, text, dotted line, Access Notice box and a full-width button. */
export function AccessCard({
  title,
  description,
  notice,
  action,
}: {
  title: string;
  description: string;
  notice: string;
  action: Action | null;
}) {
  return (
    <div className={cn("flex flex-col rounded-3xl p-6 lg:p-8", CARD_BG, !action && "opacity-75")}>
      <h2 className="font-display text-xl font-semibold tracking-wide text-black lg:text-2xl">{title}</h2>
      <p className="mt-4 flex-1 text-sm leading-relaxed tracking-[0.08em] text-black lg:text-base">{description}</p>
      <hr className="my-6 border-t-2 border-dotted border-black" />
      <div className="rounded-xl bg-[#e5e5e5] px-4 py-3">
        <p className="text-sm font-medium tracking-[0.08em] text-neutral-800">Access Notice</p>
        <p className="mt-1 text-xs tracking-[0.08em] text-neutral-700 sm:text-sm">{notice}</p>
      </div>
      {action ? (
        <Link href={action.href} className={cn(CONTROL, "mt-5 w-full px-4 py-3.5 text-sm lg:text-base")}>
          {action.label}
        </Link>
      ) : (
        <span className={cn(LOCKED, "mt-5 w-full px-4 py-3.5 text-sm")} aria-disabled>
          No access
        </span>
      )}
    </div>
  );
}
