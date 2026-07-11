import { createHash } from "node:crypto";

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Flatten a project's prose fields into { "summary.ja": "...", ... } so each
 * localized string can be hashed individually for human-edit detection.
 */
export function proseFieldPaths(project: {
  summary: Record<string, string>;
  caseStudy: {
    problem: Record<string, string>;
    solution: Record<string, string>;
    results?: Record<string, string>;
  };
  highlights: Array<{ text: Record<string, string> }>;
  timeline: Array<{ title: Record<string, string>; description?: Record<string, string> }>;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  const add = (path: string, localized: Record<string, string> | undefined) => {
    if (!localized) return;
    for (const [lang, value] of Object.entries(localized)) {
      fields[`${path}.${lang}`] = value;
    }
  };
  add("summary", project.summary);
  add("caseStudy.problem", project.caseStudy.problem);
  add("caseStudy.solution", project.caseStudy.solution);
  add("caseStudy.results", project.caseStudy.results);
  project.highlights.forEach((h, i) => add(`highlights[${i}].text`, h.text));
  project.timeline.forEach((t, i) => {
    add(`timeline[${i}].title`, t.title);
    add(`timeline[${i}].description`, t.description);
  });
  return fields;
}

/** Hash every prose field value. */
export function hashProseFields(
  project: Parameters<typeof proseFieldPaths>[0]
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(proseFieldPaths(project)).map(([path, value]) => [
      path,
      sha256(value),
    ])
  );
}
