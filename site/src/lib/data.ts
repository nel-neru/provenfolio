/**
 * Typed data accessors + density gates. Pages read through here, never
 * directly from collections, so gating/sorting rules live in one place.
 */
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export type ProjectEntry = CollectionEntry<"projects">;
export type ProjectData = ProjectEntry["data"];
export type ProfileData = CollectionEntry<"profile">["data"];
export type AggregatesData = CollectionEntry<"aggregates">["data"];

export async function getProfile(): Promise<ProfileData> {
  const entries = await getCollection("profile");
  const entry = entries[0];
  if (!entry) throw new Error("data/profile.json missing — run /setup");
  return entry.data;
}

export async function getAggregates(): Promise<AggregatesData | undefined> {
  const entries = await getCollection("aggregates");
  return entries[0]?.data;
}

export async function getProjects(): Promise<ProjectData[]> {
  const entries = await getCollection("projects");
  return entries
    .map((e) => e.data)
    .sort(
      (a, b) =>
        a.order - b.order ||
        (b.metrics?.total.lastCommit ?? "").localeCompare(
          a.metrics?.total.lastCommit ?? ""
        )
    );
}

export async function getFeatured(): Promise<ProjectData[]> {
  const all = await getProjects();
  const featured = all.filter((p) => p.featured);
  // The 15-second rule: if nothing is featured yet, surface the best-placed
  // non-archive projects so the home page is never empty.
  const pool = featured.length > 0 ? featured : all.filter((p) => p.placement !== "archive");
  return pool.slice(0, 6);
}

export function byPlacement(projects: ProjectData[]) {
  return {
    products: projects.filter((p) => p.placement === "products"),
    lab: projects.filter((p) => p.placement === "lab"),
    archive: projects.filter((p) => p.placement === "archive"),
  };
}

/* ---------------- density gates ----------------
 * Volume visualizations only render when the data can carry them; a 4-cell
 * heatmap reads as "AI-generated over a weekend" and must never ship.
 */

export function showHeatmap(p: ProjectData): boolean {
  const m = p.metrics?.total;
  return !!m && m.activeDays >= 15 && m.durationDays >= 45;
}

export function showVelocity(p: ProjectData): boolean {
  const m = p.metrics?.total;
  return !!m && m.activeDays >= 10;
}

export function showLanguages(p: ProjectData): boolean {
  return (p.metrics?.languages.length ?? 0) >= 2;
}

/** Compact metric chips are honest at any size — always available. */
export function metricChips(p: ProjectData): Array<{ key: string; value: string }> {
  const m = p.metrics;
  if (!m) return [];
  const chips: Array<{ key: string; value: string }> = [
    { key: "metrics.commits", value: String(m.total.commits) },
    { key: "metrics.activeDays", value: String(m.total.activeDays) },
  ];
  if (m.byOwner && m.ownerCommitPct !== undefined && m.ownerCommitPct < 100) {
    chips.push({ key: "metrics.byOwner", value: `${m.ownerCommitPct}%` });
  }
  return chips;
}

/** /history needs either time depth or breadth to be a story. */
export function showHistoryPage(agg: AggregatesData | undefined): boolean {
  if (!agg) return false;
  return (agg.totals.spanDays ?? 0) >= 365 || agg.totals.projects >= 4;
}

/** Skills for display: computed aggregates, adjusted by profile overrides. */
export function computeSkills(
  agg: AggregatesData | undefined,
  profile: ProfileData
): Array<{ name: string; category: string; projectIds: string[] }> {
  const base = (agg?.techFrequency ?? []).map((t) => ({
    name: t.name,
    category: t.category,
    projectIds: t.projectIds,
  }));
  const hidden = new Set(
    profile.skillOverrides.filter((o) => o.action === "hide").map((o) => o.name.toLowerCase())
  );
  const result = base.filter((s) => !hidden.has(s.name.toLowerCase()));
  for (const o of profile.skillOverrides) {
    if (o.action === "add" && !result.some((s) => s.name.toLowerCase() === o.name.toLowerCase())) {
      result.push({ name: o.name, category: o.category ?? "other", projectIds: [] });
    }
  }
  return result;
}
