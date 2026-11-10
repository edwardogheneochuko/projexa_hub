import { cache } from "react";
import { prisma } from "./db";
import type { Section, Space, Field } from "./hq-config";
import { SPACES } from "./hq-config";
import { hasConfidentialAccess, isFounder } from "./permissions";
import type { CurrentUser } from "./auth";
import { isValidDate } from "./periods";

export function canViewSection(u: CurrentUser, space: Space, section: Section) {
  if (section.confidential) {
    // Confidential sections need an explicit grant — department membership is not enough (PRD §8).
    return hasConfidentialAccess(u, section.confidential);
  }
  if (isFounder(u)) return true;
  if (space.teamSlug === null) return false; // Founder HQ
  return u.team?.slug === space.teamSlug;
}

export function canEditSection(u: CurrentUser, space: Space, section: Section) {
  return canViewSection(u, space, section);
}

/** Deleting is limited to the Founder, the space's Department Head, or confidential-access holders. */
export function canDeleteInSection(u: CurrentUser, space: Space, section: Section) {
  if (!canViewSection(u, space, section)) return false;
  if (isFounder(u)) return true;
  if (section.confidential) return u.role === "HEAD";
  return u.role === "HEAD" && u.team?.slug === space.teamSlug;
}

export function visibleSections(u: CurrentUser, space: Space) {
  return space.sections.filter((s) => canViewSection(u, space, s));
}

/** Slugs of the departments that currently exist. Cached per request. */
export const liveTeamSlugs = cache(async () => new Set((await prisma.team.findMany({ select: { slug: true } })).map((t) => t.slug)));

/** Founders HQ always exists; a department workspace only while that department exists (PRD §5.5). */
export function isLiveSpace(space: Space, slugs: Set<string>) {
  return space.teamSlug === null || slugs.has(space.teamSlug);
}

export function visibleSpaces(u: CurrentUser, slugs: Set<string>) {
  return SPACES.filter((sp) => isLiveSpace(sp, slugs) && visibleSections(u, sp).length > 0);
}

export type RecordData = Record<string, string>;

export function parseData(json: string): RecordData {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function isSafeUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function validateField(f: Field, raw: string): string | null {
  const v = raw.trim();
  if (!v) return f.required ? `${f.label} is required.` : null;
  switch (f.type) {
    case "date":
      return isValidDate(v) ? null : `${f.label} must be a valid date.`;
    case "number":
    case "money":
      return isNaN(Number(v)) ? `${f.label} must be a number.` : null;
    case "link":
      return isSafeUrl(v) ? null : `${f.label} must be a full web address starting with https://`;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : `${f.label} must be a valid email address.`;
    case "select":
      return f.options?.includes(v) ? null : `${f.label} has an invalid option.`;
    default:
      return v.length > 10_000 ? `${f.label} is too long.` : null;
  }
}

export function validateRecord(section: Section, form: FormData): { data: RecordData } | { error: string } {
  const data: RecordData = {};
  for (const f of section.fields) {
    const raw = String(form.get(`f_${f.key}`) ?? "");
    const err = validateField(f, raw);
    if (err) return { error: err };
    if (raw.trim()) data[f.key] = raw.trim();
  }
  return { data };
}
