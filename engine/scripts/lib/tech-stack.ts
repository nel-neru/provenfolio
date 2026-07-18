import type { Intake, Prose } from "../../schemas/index.js";

type TechStackEntry = Prose["techStack"][number];
type TechStackCorrections = NonNullable<Intake["techStackCorrections"]>;

/**
 * Apply the owner's intake corrections to the analyzer-proposed tech stack.
 * Pure: returns a new array; matching is case-insensitive on the name.
 * The corrected stack is what emit adopts into the project file AND what the
 * numeric lint's allow-list must be built from (an owner-added "Vue 3" makes
 * 3 a permitted number; a removed entry's version number is no longer one).
 */
export function applyTechStackCorrections(
  stack: TechStackEntry[],
  corrections: TechStackCorrections | undefined
): TechStackEntry[] {
  if (!corrections) return [...stack];
  const remove = new Set(corrections.remove.map((s) => s.toLowerCase()));
  const corrected = stack.filter((t) => !remove.has(t.name.toLowerCase()));
  for (const add of corrections.add) {
    if (!corrected.some((t) => t.name.toLowerCase() === add.toLowerCase())) {
      corrected.push({ name: add, category: "other" });
    }
  }
  return corrected;
}
