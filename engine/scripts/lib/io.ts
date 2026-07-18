import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/** Read + parse a JSON file; parse errors are rethrown with the file path attached. */
export function readJson(file: string): unknown {
  const raw = fs.readFileSync(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new ValidationFailure(
      file,
      `invalid JSON: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/** Stable 2-space formatting + trailing newline so git diffs stay clean. */
export function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(dir, f))
    .sort();
}

export class ValidationFailure extends Error {
  constructor(
    public file: string,
    public detail: string
  ) {
    super(`${file}: ${detail}`);
  }
}

/** Parse with a schema; throw a ValidationFailure with a readable report. */
export function parseWith<T extends z.ZodType>(
  schema: T,
  value: unknown,
  file: string
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationFailure(file, z.prettifyError(result.error));
  }
  return result.data;
}

