import type { Project, Profile, Intake } from "../../schemas/index.js";

/**
 * Compute a project's completeness: what a credible portfolio entry still
 * lacks. Shown as Studio's meter and enforced by /publish for featured
 * projects. Deterministic — same inputs, same score.
 */
export interface CompletenessInput {
  project: Omit<Project, "completeness" | "generated">;
  profile: Pick<Profile, "sourceLang" | "targetLangs">;
  intake?: Pick<Intake, "outcomes" | "role"> | undefined;
}

const WEIGHTS: Record<string, number> = {
  role: 10,
  "demo-link": 15,
  visual: 15,
  "case-study": 15,
  results: 10,
  highlights: 10,
  translation: 15,
  timeline: 10,
};

export function computeCompleteness({
  project,
  profile,
  intake,
}: CompletenessInput): { score: number; missing: string[] } {
  const missing: string[] = [];
  const sl = profile.sourceLang;
  const filled = (t: Record<string, string> | undefined) => !!t?.[sl]?.trim();

  if (!project.role && !intake?.role) missing.push("role");

  if (!project.links.some((l) => ["demo", "store", "video"].includes(l.kind))) {
    missing.push("demo-link");
  }

  if (project.screenshots.length === 0 && !project.architectureDiagram) {
    missing.push("visual");
  }

  if (
    !filled(project.summary) ||
    !filled(project.caseStudy.problem) ||
    !filled(project.caseStudy.solution)
  ) {
    missing.push("case-study");
  }

  // Results only expected where a business outcome is plausible.
  const businesslike = ["product", "service", "client"].includes(project.category);
  if (businesslike && !project.caseStudy.results && (intake?.outcomes ?? []).length === 0) {
    missing.push("results");
  }

  if (project.highlights.length < 2) missing.push("highlights");

  const untranslated = profile.targetLangs.filter((lang) => {
    const t = (x: Record<string, string> | undefined) => !!x?.[lang]?.trim();
    return !(
      t(project.summary) &&
      t(project.caseStudy.problem) &&
      t(project.caseStudy.solution) &&
      project.highlights.every((h) => t(h.text))
    );
  });
  if (untranslated.length > 0) {
    missing.push(...untranslated.map((l) => `translation:${l}`));
  }

  const hasGithubSource = project.sources.some((s) => s.type === "github");
  if (hasGithubSource && project.timeline.length === 0) missing.push("timeline");

  // The translation weight is a single budget shared by all target languages:
  // each missing language costs weight * (1 / targetLangs.length), rounded.
  // Charging the full weight per language would let multilingual profiles
  // overdraw the 100-point scale and pin the score at 0.
  const translationLost =
    untranslated.length > 0
      ? Math.round(
          ((WEIGHTS["translation"] ?? 0) * untranslated.length) /
            profile.targetLangs.length
        )
      : 0;
  const lost = missing.reduce((sum, key) => {
    const base = key.split(":")[0] ?? key;
    return base === "translation" ? sum : sum + (WEIGHTS[base] ?? 0);
  }, translationLost);
  return { score: Math.max(0, 100 - lost), missing };
}
