import type { ProjectMetrics, Intake, Prose } from "../../schemas/index.js";

/**
 * Provenance lints — the structural enforcement behind golden rule #3
 * ("no unsupported claims"). Prose numbers must exist in metrics, intake
 * outcomes, or analyzer-verified facts; puffery phrases are banned outright.
 */

const NUMBER_TOKEN = /\d+(?:[.,]\d+)?/g;

/** Unverifiable-claim phrases (always rejected — state the checkable fact instead). */
const BANNED_PHRASES = [
  // en
  "battle-tested",
  "battle tested",
  "production-grade",
  "production grade",
  "widely adopted",
  "widely used",
  "used by many",
  "industry-standard",
  "industry standard",
  "world-class",
  "best-in-class",
  "blazingly fast",
  "enterprise-grade",
  // ja
  "多くのユーザー",
  "広く使われ",
  "広く採用",
  "実績多数",
  "業界標準",
  "最高峰",
  "圧倒的",
  "爆速",
  "プロダクショングレード",
  "エンタープライズグレード",
];

function extractNumbers(text: string): number[] {
  return [...text.matchAll(NUMBER_TOKEN)].map((m) =>
    parseFloat(m[0].replace(",", "."))
  );
}

function dateComponents(iso: string | undefined): number[] {
  if (!iso) return [];
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return [];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function numericLeaves(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number" && Number.isFinite(value)) out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => numericLeaves(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => numericLeaves(v, out));
  return out;
}

export function buildAllowedNumbers(opts: {
  metrics?: ProjectMetrics | undefined;
  intake?: Pick<Intake, "outcomes"> | undefined;
  prose: Pick<Prose, "verifiedNumbers" | "techStack" | "timeline">;
  projectName: string;
}): Set<number> {
  const allowed = new Set<number>();

  if (opts.metrics) {
    // every numeric leaf: commits, activeDays, durations, pcts, day counts...
    for (const n of numericLeaves(opts.metrics)) allowed.add(n);
    for (const d of [
      opts.metrics.total.firstCommit,
      opts.metrics.total.lastCommit,
      opts.metrics.total.velocity.peakDay?.date,
    ]) {
      for (const c of dateComponents(d)) allowed.add(c);
    }
  }
  for (const o of opts.intake?.outcomes ?? []) {
    for (const n of extractNumbers(`${o.label} ${o.value}`)) allowed.add(n);
  }
  for (const v of opts.prose.verifiedNumbers) {
    for (const n of extractNumbers(v.value)) allowed.add(n);
  }
  // Version numbers inside declared tech names ("Svelte 5", "Tauri v2")
  for (const t of opts.prose.techStack) {
    for (const n of extractNumbers(t.name)) allowed.add(n);
  }
  for (const n of extractNumbers(opts.projectName)) allowed.add(n);
  // Timeline event dates are themselves evidence-carrying
  for (const ev of opts.prose.timeline) {
    for (const c of dateComponents(ev.date)) allowed.add(c);
  }
  return allowed;
}

export interface LintError {
  field: string;
  message: string;
}

export function lintNumbers(
  proseFields: Record<string, string>,
  allowed: Set<number>
): LintError[] {
  const errors: LintError[] = [];
  for (const [field, text] of Object.entries(proseFields)) {
    for (const n of extractNumbers(text)) {
      if (!allowed.has(n)) {
        errors.push({
          field,
          message: `number ${n} has no source in metrics/intake/verifiedNumbers — remove it or add a verified fact with evidence`,
        });
      }
    }
  }
  return errors;
}

export function lintBannedPhrases(
  proseFields: Record<string, string>
): LintError[] {
  const errors: LintError[] = [];
  for (const [field, text] of Object.entries(proseFields)) {
    const lower = text.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase.toLowerCase())) {
        errors.push({
          field,
          message: `banned unverifiable phrase "${phrase}" — state the checkable fact instead`,
        });
      }
    }
  }
  return errors;
}
