import type { Aggregates, Project } from "../../schemas/index.js";
import { SCHEMA_VERSION } from "../../schemas/index.js";

/**
 * Cross-project aggregation — deterministic, runs after every emit/refresh.
 * Produces the evidence-linked skill data and /history inputs.
 */
export function computeAggregates(
  projects: Project[],
  engineNow: string
): Aggregates {
  const tech = new Map<
    string,
    { category: string; projectIds: string[]; firstUsed?: string; lastUsed?: string }
  >();
  const dayUnion = new Set<string>();
  const yearly = new Map<string, { commits: number; days: Set<string> }>();
  let commitTotal = 0;

  const spans: Aggregates["projectSpans"] = [];

  for (const p of projects) {
    const first = p.metrics?.total.firstCommit?.slice(0, 10);
    const last = p.metrics?.total.lastCommit?.slice(0, 10);

    for (const t of p.techStack) {
      const entry = tech.get(t.name) ?? {
        category: t.category,
        projectIds: [],
      };
      entry.projectIds.push(p.id);
      if (first && (!entry.firstUsed || first < entry.firstUsed)) entry.firstUsed = first;
      if (last && (!entry.lastUsed || last > entry.lastUsed)) entry.lastUsed = last;
      tech.set(t.name, entry);
    }

    if (p.metrics) {
      commitTotal += p.metrics.total.commits;
      for (const d of p.metrics.total.commitsByDay) {
        dayUnion.add(d.date);
        const year = d.date.slice(0, 4);
        const y = yearly.get(year) ?? { commits: 0, days: new Set<string>() };
        y.commits += d.count;
        y.days.add(d.date);
        yearly.set(year, y);
      }
    }

    spans.push({
      id: p.id,
      name: p.name,
      category: p.category,
      placement: p.placement,
      firstCommit: first,
      lastCommit: last,
      commits: p.metrics?.total.commits,
    });
  }

  const allDays = [...dayUnion].sort();
  const spanDays =
    allDays.length >= 2
      ? Math.round(
          (Date.parse(allDays[allDays.length - 1]!) - Date.parse(allDays[0]!)) /
            86_400_000
        )
      : undefined;

  // Top languages per year: most-used language of each project active that year
  const yearTopLangs = new Map<string, Map<string, number>>();
  for (const p of projects) {
    if (!p.metrics) continue;
    const topLang = p.metrics.languages[0]?.name;
    if (!topLang) continue;
    const years = new Set(p.metrics.total.commitsByDay.map((d) => d.date.slice(0, 4)));
    for (const y of years) {
      const m = yearTopLangs.get(y) ?? new Map<string, number>();
      m.set(topLang, (m.get(topLang) ?? 0) + 1);
      yearTopLangs.set(y, m);
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: engineNow,
    totals: {
      projects: projects.length,
      commits: commitTotal,
      activeDays: dayUnion.size,
      spanDays,
    },
    techFrequency: [...tech.entries()]
      .sort(([, a], [, b]) => b.projectIds.length - a.projectIds.length)
      .map(([name, e]) => ({ name, ...e })),
    projectSpans: spans.sort((a, b) =>
      (a.firstCommit ?? "9999").localeCompare(b.firstCommit ?? "9999")
    ),
    yearlyActivity: [...yearly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, y]) => ({
        year: Number(year),
        commits: y.commits,
        activeDays: y.days.size,
        topLanguages: [...(yearTopLangs.get(year) ?? new Map())]
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([lang]) => lang),
      })),
  };
}
