/**
 * Provenfolio Studio — the owner's local intake/curation cockpit.
 *
 * LOCALHOST ONLY (binds 127.0.0.1). Never deployed. Serves the static GUI
 * from studio/public/ plus a JSON API that reads/writes the data contract
 * (data/*.json) through the same Zod schemas the engine uses — the Studio
 * never bypasses validation (golden rule 8).
 */
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { z } from "zod";

import {
  intakeSchema,
  projectSchema,
  manifestSchema,
  profileSchema,
  SCHEMA_VERSION,
  type Project,
  type Intake,
  type Manifest,
  type Profile,
} from "../engine/schemas/index.js";
import {
  ROOT,
  DATA_DIR,
  PROJECTS_DIR,
  INTAKE_DIR,
  PROFILE_FILE,
  MANIFEST_FILE,
  projectFile,
  intakeFile,
} from "../engine/scripts/lib/paths.js";
import { readJson, writeJson, listJsonFiles } from "../engine/scripts/lib/io.js";
import { computeCompleteness } from "../engine/scripts/lib/completeness.js";
import { parseRepoUrl, slugify } from "../engine/sources/github/lib.js";
import { themeCssVars, themeFontFaces } from "../site/src/theme.js";

const HOST = "127.0.0.1";
const PORT = 4600;
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const SCREENSHOTS_DIR = path.join(DATA_DIR, "assets", "screenshots");
const SITE_FONTS_DIR = path.join(ROOT, "site", "public", "fonts");
const THEME_CONFIG_FILE = path.join(ROOT, "site", "theme.config.mjs");
const THEMES_DIR = path.join(ROOT, "site", "src", "themes");

const JSON_BODY_LIMIT = 1 * 1024 * 1024; // 1MB
const IMAGE_BODY_LIMIT = 10 * 1024 * 1024; // 10MB

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const buf = Buffer.from(JSON.stringify(body, null, 2));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": buf.length,
  });
  res.end(buf);
}

function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new HttpError(413, `Body exceeds ${limit} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const buf = await readBody(req, JSON_BODY_LIMIT);
  if (buf.length === 0) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** safeParse + 400 with a readable Zod report on failure. */
function validate<T extends z.ZodType>(schema: T, value: unknown, label: string): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, `${label}: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

function assertSlug(id: string): string {
  if (!SLUG_RE.test(id)) throw new HttpError(400, `Invalid id: "${id}"`);
  return id;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Contract file access
// ---------------------------------------------------------------------------

function loadProfile(): Profile {
  return validate(profileSchema, readJson(PROFILE_FILE), "profile.json");
}

function loadManifest(): Manifest {
  return validate(manifestSchema, readJson(MANIFEST_FILE), "manifest.json");
}

function loadProject(id: string): Project {
  const file = projectFile(assertSlug(id));
  if (!fs.existsSync(file)) throw new HttpError(404, `No project "${id}"`);
  return validate(projectSchema, readJson(file), path.basename(file));
}

function loadIntake(id: string): Intake | undefined {
  const file = intakeFile(assertSlug(id));
  if (!fs.existsSync(file)) return undefined;
  const parsed = intakeSchema.safeParse(readJson(file));
  return parsed.success ? parsed.data : undefined;
}

/** Recompute + persist completeness on a project doc (mutates). */
function recomputeCompleteness(project: Project, profile?: Profile): Project {
  const prof = profile ?? loadProfile();
  const intake = loadIntake(project.id);
  const { completeness: _c, generated: _g, ...rest } = project;
  project.completeness = computeCompleteness({
    project: rest,
    profile: prof,
    intake: intake ? { outcomes: intake.outcomes, role: intake.role } : undefined,
  });
  return project;
}

/** Validate then write a project doc; returns the parsed (canonical) doc. */
function saveProject(project: unknown): Project {
  const parsed = validate(projectSchema, project, "project");
  writeJson(projectFile(parsed.id), parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// Streamed runners (one job at a time each, ring buffer + SSE fan-out).
// Two instances: the /analyze launcher and the engine-update sequence.
// ---------------------------------------------------------------------------

const LOG_LIMIT = 2000;

class StreamRunner {
  private log: string[] = [];
  private clients = new Set<ServerResponse>();
  private lastExitCode: number | null = null;
  running = false;

  push(line: string): void {
    this.log.push(line);
    if (this.log.length > LOG_LIMIT) this.log = this.log.slice(-LOG_LIMIT);
    for (const client of this.clients) {
      client.write(`data: ${line}\n\n`);
    }
  }

  done(code: number | null): void {
    this.running = false;
    this.lastExitCode = code;
    for (const client of this.clients) {
      client.write(`event: done\ndata: ${code ?? ""}\n\n`);
    }
  }

  /** Exit code of the last finished job (null while running or before any job). */
  get exitCode(): number | null {
    return this.lastExitCode;
  }

  /** Claim the runner for a new job (409 when one is already running). */
  begin(conflictMessage: string): void {
    if (this.running) throw new HttpError(409, conflictMessage);
    this.running = true;
    this.log = [];
    this.lastExitCode = null;
  }

  stream(res: ServerResponse): void {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    for (const line of this.log) res.write(`data: ${line}\n\n`);
    if (!this.running) {
      res.write(`event: done\ndata: ${this.lastExitCode ?? ""}\n\n`);
    }
    this.clients.add(res);
    res.on("close", () => this.clients.delete(res));
  }
}

const analyzeRunner = new StreamRunner();
const engineRunner = new StreamRunner();

function pushChunkLines(runner: StreamRunner, chunk: Buffer, carry: { buf: string }): void {
  carry.buf += chunk.toString("utf8");
  const lines = carry.buf.split(/\r?\n/);
  carry.buf = lines.pop() ?? "";
  for (const line of lines) runner.push(line);
}

function startAnalyze(): void {
  if (engineRunner.running) {
    throw new HttpError(409, "Engine update running — wait for it to finish first");
  }
  analyzeRunner.begin("Analysis already running");
  analyzeRunner.push(`[studio] ${nowIso()} launching claude -p "/analyze --pending" ...`);

  // The claude CLI is an npm .cmd shim on Windows, so it needs a shell there —
  // but a shell concatenates args without escaping, which would split the
  // prompt at its space ("--pending" became an unknown claude option). Quote
  // the prompt manually on the shell path only.
  const useShell = process.platform === "win32";
  const prompt = "/analyze --pending";
  let child: ChildProcess;
  try {
    child = spawn(
      "claude",
      ["-p", useShell ? `"${prompt}"` : prompt, "--permission-mode", "acceptEdits"],
      {
        cwd: ROOT,
        shell: useShell,
        windowsHide: true,
        // No stdin: an open-but-silent pipe makes the claude CLI wait 3s and
        // print a "no stdin data received" warning before proceeding.
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch {
    analyzeRunner.push('Claude Code CLI not found. Run "/analyze --pending" in Claude Code instead.');
    analyzeRunner.done(-1);
    return;
  }

  const outCarry = { buf: "" };
  const errCarry = { buf: "" };
  child.stdout?.on("data", (chunk: Buffer) => pushChunkLines(analyzeRunner, chunk, outCarry));
  child.stderr?.on("data", (chunk: Buffer) => pushChunkLines(analyzeRunner, chunk, errCarry));

  child.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      analyzeRunner.push('Claude Code CLI not found. Run "/analyze --pending" in Claude Code instead.');
    } else {
      analyzeRunner.push(`[studio] spawn error: ${err.message}`);
    }
    analyzeRunner.done(-1);
  });

  child.on("close", (code) => {
    if (outCarry.buf) analyzeRunner.push(outCarry.buf);
    if (errCarry.buf) analyzeRunner.push(errCarry.buf);
    analyzeRunner.push(`[studio] exited (exit code ${code ?? "?"})`);
    analyzeRunner.done(code);
  });
}

// ---------------------------------------------------------------------------
// Engine updates — the GUI face of engine/docs/UPDATING.md. Runs the exact
// documented sequence (fetch → merge → install → migrate → validate → build)
// against the "engine" remote, streaming progress over SSE. A failed merge is
// aborted so the working tree is never left conflicted.
// ---------------------------------------------------------------------------

const ENGINE_REMOTE = "engine";
const ENGINE_BRANCH = "main";
// Safety nets so a wedged child can never claim the runner forever. Generous,
// because npm install/build are legitimately slow on cold caches.
const STEP_TIMEOUT_MS = 30 * 60 * 1000;
const CAPTURE_TIMEOUT_MS = 2 * 60 * 1000;

/** Spawn a step, streaming its output into `runner`; resolves the exit code. */
function runStep(
  runner: StreamRunner,
  cmd: string,
  args: string[],
  npmStyle = false
): Promise<number> {
  return new Promise((resolve) => {
    runner.push(`[studio] $ ${cmd} ${args.join(" ")}`);
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (code: number) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(code);
      }
    };
    let child: ChildProcess;
    try {
      // npm resolves to npm.cmd on Windows, which needs a shell; the args are
      // fixed literals, never user input.
      child = spawn(cmd, args, {
        cwd: ROOT,
        shell: npmStyle && process.platform === "win32",
        windowsHide: true,
      });
    } catch (err) {
      runner.push(`[studio] spawn error: ${(err as Error).message}`);
      finish(-1);
      return;
    }
    timer = setTimeout(() => {
      runner.push(`[studio] ${cmd} ${args.join(" ")} timed out after ${STEP_TIMEOUT_MS / 60000} min — killing it`);
      child.kill();
      // If the kill is ignored (e.g. a detached npm.cmd child), fail the step anyway.
      setTimeout(() => finish(-1), 10_000);
    }, STEP_TIMEOUT_MS);
    const outCarry = { buf: "" };
    const errCarry = { buf: "" };
    child.stdout?.on("data", (chunk: Buffer) => pushChunkLines(runner, chunk, outCarry));
    child.stderr?.on("data", (chunk: Buffer) => pushChunkLines(runner, chunk, errCarry));
    child.on("error", (err) => {
      runner.push(`[studio] ${cmd}: ${err.message}`);
      finish(-1);
    });
    child.on("close", (code) => {
      if (outCarry.buf) runner.push(outCarry.buf);
      if (errCarry.buf) runner.push(errCarry.buf);
      finish(code ?? -1);
    });
  });
}

/** Run a quick command silently, capturing stdout+stderr. */
function runCapture(cmd: string, args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (code: number, out: string) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ code, out });
      }
    };
    let child: ChildProcess;
    try {
      child = spawn(cmd, args, { cwd: ROOT, windowsHide: true });
    } catch (err) {
      finish(-1, (err as Error).message);
      return;
    }
    timer = setTimeout(() => {
      child.kill();
      setTimeout(() => finish(-1, `${cmd} timed out`), 5_000);
    }, CAPTURE_TIMEOUT_MS);
    const chunks: Buffer[] = [];
    child.stdout?.on("data", (c: Buffer) => chunks.push(c));
    child.stderr?.on("data", (c: Buffer) => chunks.push(c));
    child.on("error", (err) => finish(-1, err.message));
    child.on("close", (code) => finish(code ?? -1, Buffer.concat(chunks).toString("utf8")));
  });
}

function engineVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      version?: string;
    };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * GET /api/engine/status[?fetch=1] — remote presence, engine version, and how
 * far behind the local checkout is. `fetch=1` contacts the remote first (the
 * "Check for updates" button); without it the answer is offline-only.
 */
async function apiEngineStatus(url: URL): Promise<unknown> {
  const base = {
    version: engineVersion(),
    running: engineRunner.running,
    lastExit: engineRunner.exitCode,
  };
  const remote = await runCapture("git", ["remote", "get-url", ENGINE_REMOTE]);
  if (remote.code !== 0) {
    return { ...base, remote: null, behind: null, commits: [] };
  }
  if (url.searchParams.get("fetch") === "1") {
    const fetched = await runCapture("git", ["fetch", ENGINE_REMOTE]);
    if (fetched.code !== 0) {
      throw new HttpError(502, `git fetch ${ENGINE_REMOTE} failed: ${fetched.out.trim()}`);
    }
  }
  const range = `HEAD..${ENGINE_REMOTE}/${ENGINE_BRANCH}`;
  const count = await runCapture("git", ["rev-list", "--count", range]);
  if (count.code !== 0) {
    // engine/main not fetched yet — behind is unknowable offline
    return { ...base, remote: remote.out.trim(), behind: null, commits: [] };
  }
  const behind = Number.parseInt(count.out.trim(), 10) || 0;
  let commits: string[] = [];
  if (behind > 0) {
    const log = await runCapture("git", ["log", "--oneline", "--no-decorate", "-n", "20", range]);
    if (log.code === 0) commits = log.out.split(/\r?\n/).filter(Boolean);
  }
  return { ...base, remote: remote.out.trim(), behind, commits };
}

function startEngineUpdate(): void {
  if (analyzeRunner.running) {
    throw new HttpError(409, "Analysis is running — wait for it to finish first");
  }
  engineRunner.begin("Engine update already running");
  engineRunner.push(`[studio] ${nowIso()} engine update (see engine/docs/UPDATING.md)`);

  void (async () => {
    try {
      const remote = await runCapture("git", ["remote", "get-url", ENGINE_REMOTE]);
      if (remote.code !== 0) {
        engineRunner.push(`[studio] No "${ENGINE_REMOTE}" git remote is configured.`);
        engineRunner.push(
          `[studio] One-time setup: git remote add ${ENGINE_REMOTE} <distribution-repo-url>`
        );
        engineRunner.done(1);
        return;
      }

      let code = await runStep(engineRunner, "git", ["fetch", ENGINE_REMOTE]);
      if (code !== 0) {
        engineRunner.done(code);
        return;
      }

      const range = `HEAD..${ENGINE_REMOTE}/${ENGINE_BRANCH}`;
      const count = await runCapture("git", ["rev-list", "--count", range]);
      const behind = count.code === 0 ? Number.parseInt(count.out.trim(), 10) || 0 : -1;
      if (behind === 0) {
        engineRunner.push("[studio] Already up to date.");
        engineRunner.done(0);
        return;
      }
      if (behind > 0) engineRunner.push(`[studio] ${behind} new engine commit(s) — merging ...`);

      code = await runStep(engineRunner, "git", [
        "merge",
        "--no-edit",
        `${ENGINE_REMOTE}/${ENGINE_BRANCH}`,
      ]);
      if (code !== 0) {
        // Roll back a half-applied merge so the tree is never left conflicted.
        const midMerge = await runCapture("git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"]);
        let rolledBack = true;
        if (midMerge.code === 0) {
          rolledBack = (await runStep(engineRunner, "git", ["merge", "--abort"])) === 0;
        }
        engineRunner.push(
          rolledBack
            ? "[studio] Merge did not apply cleanly — no changes were kept."
            : "[studio] Merge did not apply cleanly AND the automatic rollback failed — the working tree may still contain conflicts."
        );
        engineRunner.push(
          '[studio] Ask Claude Code to "pull the engine update" to resolve it interactively.'
        );
        engineRunner.done(code);
        return;
      }

      for (const args of [["install"], ["run", "migrate"], ["run", "validate"], ["run", "build"]]) {
        code = await runStep(engineRunner, "npm", args, true);
        if (code !== 0) {
          engineRunner.push(`[studio] npm ${args.join(" ")} failed (exit code ${code}).`);
          engineRunner.done(code);
          return;
        }
      }

      engineRunner.push("[studio] Engine update complete. Restart Studio to run the updated engine.");
      engineRunner.done(0);
    } catch (err) {
      engineRunner.push(`[studio] update error: ${(err as Error).message}`);
      engineRunner.done(-1);
    }
  })();
}

// ---------------------------------------------------------------------------
// API handlers
// ---------------------------------------------------------------------------

function apiState(): unknown {
  const projects = listJsonFiles(PROJECTS_DIR).map((f) => readJson(f));
  const intakes = listJsonFiles(INTAKE_DIR).map((f) => ({
    id: path.basename(f, ".json"),
    ...(readJson(f) as object),
  }));
  return {
    profile: readJson(PROFILE_FILE),
    manifest: readJson(MANIFEST_FILE),
    projects,
    intakes,
  };
}

// ---------------------------------------------------------------------------
// Site design (theme.config.mjs) — the buyer picks the live theme and the
// visitor-switcher set from the GUI instead of hand-editing the config.
// ---------------------------------------------------------------------------

/** Installed themes = directories under site/src/themes/ that ship a manifest.ts. */
function listInstalledThemes(): string[] {
  if (!fs.existsSync(THEMES_DIR)) return [];
  return fs
    .readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(THEMES_DIR, d.name, "manifest.ts")))
    .map((d) => d.name)
    .sort();
}

/** Re-import theme.config.mjs fresh (cache-busted) so edits are reflected live. */
async function readThemeConfig(): Promise<{ activeTheme: string; visitorThemes: "all" | string[] }> {
  const url = `${pathToFileURL(THEME_CONFIG_FILE).href}?v=${Date.now()}`;
  const mod = (await import(url)) as { activeTheme: string; visitorThemes: "all" | string[] };
  return { activeTheme: mod.activeTheme, visitorThemes: mod.visitorThemes };
}

/** Rewrite only the two export lines, preserving the file's comment header. */
function writeThemeConfig(activeTheme: string, visitorThemes: "all" | string[]): void {
  const src = fs.readFileSync(THEME_CONFIG_FILE, "utf8");
  const vt = visitorThemes === "all" ? '"all"' : JSON.stringify(visitorThemes);
  let out = src;
  if (/export const activeTheme = "[^"]*";/.test(out)) {
    out = out.replace(/export const activeTheme = "[^"]*";/, `export const activeTheme = "${activeTheme}";`);
  } else {
    throw new HttpError(500, "theme.config.mjs: could not find the activeTheme export to update");
  }
  if (/export const visitorThemes = [^;]*;/.test(out)) {
    out = out.replace(/export const visitorThemes = [^;]*;/, `export const visitorThemes = ${vt};`);
  } else {
    throw new HttpError(500, "theme.config.mjs: could not find the visitorThemes export to update");
  }
  fs.writeFileSync(THEME_CONFIG_FILE, out);
}

async function apiGetTheme(): Promise<unknown> {
  const cfg = await readThemeConfig();
  return { ...cfg, installed: listInstalledThemes() };
}

const themePatchSchema = z.object({
  activeTheme: z.string().regex(SLUG_RE).optional(),
  visitorThemes: z.union([z.literal("all"), z.array(z.string().regex(SLUG_RE))]).optional(),
});

async function apiPutTheme(body: unknown): Promise<unknown> {
  const patch = validate(themePatchSchema, body, "theme patch");
  const installed = listInstalledThemes();
  const current = await readThemeConfig();

  const activeTheme = patch.activeTheme ?? current.activeTheme;
  if (!installed.includes(activeTheme)) {
    throw new HttpError(400, `Unknown theme "${activeTheme}" — installed: ${installed.join(", ")}`);
  }

  let visitorThemes = patch.visitorThemes ?? current.visitorThemes;
  if (Array.isArray(visitorThemes)) {
    const unknown = visitorThemes.filter((t) => !installed.includes(t));
    if (unknown.length > 0) {
      throw new HttpError(400, `Unknown theme(s): ${unknown.join(", ")}`);
    }
    // Normalize "every installed theme" to "all" so the config stays tidy.
    if (installed.every((t) => visitorThemes.includes(t))) visitorThemes = "all";
  }

  writeThemeConfig(activeTheme, visitorThemes);
  return { activeTheme, visitorThemes, installed };
}

function apiCreateIntake(body: unknown): unknown {
  const b = (body ?? {}) as Record<string, unknown>;
  let id: string;
  let doc: Record<string, unknown>;

  if (b.manual === true) {
    const displayName = typeof b.displayName === "string" ? b.displayName.trim() : "";
    if (!displayName) throw new HttpError(400, "manual intake requires displayName");
    id = slugify(displayName);
    doc = {
      schemaVersion: SCHEMA_VERSION,
      sourceType: "manual",
      state: "pending",
      displayName,
      updatedAt: nowIso(),
    };
  } else {
    const repoUrl = typeof b.repoUrl === "string" ? b.repoUrl.trim() : "";
    if (!repoUrl) throw new HttpError(400, "repoUrl is required");
    let ref;
    try {
      ref = parseRepoUrl(repoUrl);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    id = ref.projectId;
    doc = {
      schemaVersion: SCHEMA_VERSION,
      sourceType: "github",
      state: "pending",
      repoUrl: `https://github.com/${ref.owner}/${ref.name}`,
      updatedAt: nowIso(),
    };
  }

  const file = intakeFile(id);
  if (fs.existsSync(file)) throw new HttpError(409, `Intake "${id}" already exists`);
  const parsed = validate(intakeSchema, doc, "intake");
  writeJson(file, parsed);
  return { id, ...parsed };
}

function apiPutIntake(id: string, body: unknown): unknown {
  assertSlug(id);
  const parsed = validate(intakeSchema, body, "intake");
  writeJson(intakeFile(id), parsed);

  // Intake role/outcomes feed completeness — keep the project doc in sync.
  if (fs.existsSync(projectFile(id))) {
    const project = loadProject(id);
    saveProject(recomputeCompleteness(project));
  }
  return { id, ...parsed };
}

const metaPatchSchema = z.object({
  featured: z.boolean().optional(),
  placement: z.enum(["products", "lab", "archive"]).optional(),
  order: z.number().int().optional(),
  status: z.enum(["active", "maintained", "archived"]).optional(),
});

function apiPutProjectMeta(id: string, body: unknown): unknown {
  const patch = validate(metaPatchSchema, body, "meta patch");
  const project = loadProject(id);

  if (patch.featured !== undefined) project.featured = patch.featured;
  if (patch.placement !== undefined) project.placement = patch.placement;
  if (patch.order !== undefined) project.order = patch.order;
  if (patch.status !== undefined) project.status = patch.status;

  const saved = saveProject(recomputeCompleteness(project));

  const manifest = loadManifest();
  let entry = manifest.projects.find((p) => p.id === id);
  if (!entry) {
    entry = { id, featured: saved.featured, placement: saved.placement, order: saved.order };
    manifest.projects.push(entry);
  }
  entry.featured = saved.featured;
  entry.placement = saved.placement;
  entry.order = saved.order;
  manifest.lastUpdated = nowIso();
  const savedManifest = validate(manifestSchema, manifest, "manifest");
  writeJson(MANIFEST_FILE, savedManifest);

  return { project: saved, manifest: savedManifest };
}

const proseEditsSchema = z.object({
  edits: z
    .array(
      z.object({
        path: z.string().min(1),
        lang: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
        value: z.string(),
      })
    )
    .min(1),
});

/**
 * Apply owner prose edits. Deliberately does NOT touch generated.contentHashes:
 * a hash mismatch marks the field as human-owned so re-analysis never
 * overwrites it silently (design, not an omission).
 */
function apiPutProjectProse(id: string, body: unknown): unknown {
  const { edits } = validate(proseEditsSchema, body, "prose edits");
  const project = loadProject(id);

  for (const edit of edits) {
    const { path: p, lang, value } = edit;
    let m: RegExpMatchArray | null;
    if (p === "summary") {
      project.summary[lang] = value;
    } else if ((m = p.match(/^caseStudy\.(problem|solution|results)$/))) {
      const key = m[1] as "problem" | "solution" | "results";
      if (key === "results") {
        if (!project.caseStudy.results) {
          if (!value.trim()) continue; // don't create an empty results block
          project.caseStudy.results = {};
        }
        project.caseStudy.results[lang] = value;
      } else {
        project.caseStudy[key][lang] = value;
      }
    } else if ((m = p.match(/^highlights\[(\d+)\]\.text$/))) {
      const h = project.highlights[Number(m[1])];
      if (!h) throw new HttpError(400, `No highlight at index ${m[1]}`);
      h.text[lang] = value;
    } else if ((m = p.match(/^timeline\[(\d+)\]\.(title|description)$/))) {
      const ev = project.timeline[Number(m[1])];
      if (!ev) throw new HttpError(400, `No timeline event at index ${m[1]}`);
      if (m[2] === "title") {
        ev.title[lang] = value;
      } else {
        if (!ev.description) {
          if (!value.trim()) continue;
          ev.description = {};
        }
        ev.description[lang] = value;
      }
    } else {
      throw new HttpError(400, `Unsupported prose path: "${p}"`);
    }
  }

  // An all-empty results block means "no results" — remove it so the site
  // falls back to the craft variant and completeness stays honest.
  if (
    project.caseStudy.results &&
    Object.values(project.caseStudy.results).every((v) => !v.trim())
  ) {
    delete project.caseStudy.results;
  }

  return saveProject(recomputeCompleteness(project));
}

function sanitizeScreenshotName(raw: string): string {
  const base = path.basename(raw).toLowerCase().replace(/\s+/g, "-");
  if (!/^[a-z0-9._-]+$/.test(base)) {
    throw new HttpError(400, `Invalid filename "${raw}" (allowed: a-z 0-9 . _ -)`);
  }
  const ext = path.extname(base).slice(1);
  if (!IMAGE_EXTS.has(ext)) {
    throw new HttpError(400, `Unsupported extension ".${ext}" (allowed: png jpg jpeg webp gif)`);
  }
  return base;
}

async function apiPostScreenshot(
  id: string,
  url: URL,
  req: IncomingMessage
): Promise<unknown> {
  const project = loadProject(id);
  const rawName = url.searchParams.get("filename");
  if (!rawName) throw new HttpError(400, "filename query parameter required");
  let name = sanitizeScreenshotName(rawName);

  const bytes = await readBody(req, IMAGE_BODY_LIMIT);
  if (bytes.length === 0) throw new HttpError(400, "Empty image body");

  const dir = path.join(SCREENSHOTS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  // Never clobber an existing file: suffix -1, -2, ...
  const ext = path.extname(name);
  const stem = name.slice(0, -ext.length);
  for (let i = 1; fs.existsSync(path.join(dir, name)); i++) {
    name = `${stem}-${i}${ext}`;
  }
  fs.writeFileSync(path.join(dir, name), bytes);

  const profile = loadProfile();
  const src = `assets/screenshots/${id}/${name}`;
  project.screenshots.push({ src, alt: { [profile.sourceLang]: name } });
  return saveProject(recomputeCompleteness(project, profile));
}

const altSchema = z.object({
  src: z.string().min(1),
  lang: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  value: z.string(),
});

function apiPutScreenshotAlt(id: string, body: unknown): unknown {
  const { src, lang, value } = validate(altSchema, body, "alt edit");
  const project = loadProject(id);
  const shot = project.screenshots.find((s) => s.src === src);
  if (!shot) throw new HttpError(404, `No screenshot with src "${src}"`);
  shot.alt[lang] = value;
  return saveProject(recomputeCompleteness(project));
}

function apiDeleteScreenshot(id: string, url: URL): unknown {
  const src = url.searchParams.get("src");
  if (!src) throw new HttpError(400, "src query parameter required");
  const project = loadProject(id);

  const idx = project.screenshots.findIndex((s) => s.src === src);
  if (idx === -1) throw new HttpError(404, `No screenshot with src "${src}"`);
  project.screenshots.splice(idx, 1);

  // Only ever delete files inside this project's own screenshot directory.
  const prefix = `assets/screenshots/${id}/`;
  if (src.startsWith(prefix)) {
    const name = src.slice(prefix.length);
    if (/^[a-z0-9._-]+$/i.test(name)) {
      const file = path.join(SCREENSHOTS_DIR, id, name);
      const resolved = path.resolve(file);
      if (resolved.startsWith(path.resolve(SCREENSHOTS_DIR, id) + path.sep) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    }
  }

  return saveProject(recomputeCompleteness(project));
}

// ---------------------------------------------------------------------------
// Static files (studio/public/ + data/assets/ for screenshot thumbnails)
// ---------------------------------------------------------------------------

function serveFileWithin(rootDir: string, relPath: string, res: ServerResponse): void {
  const resolved = path.resolve(rootDir, "." + path.posix.normalize("/" + relPath));
  if (resolved !== path.resolve(rootDir) && !resolved.startsWith(path.resolve(rootDir) + path.sep)) {
    throw new HttpError(403, "Forbidden");
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new HttpError(404, "Not found");
  }
  const mime = MIME[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
  const body = fs.readFileSync(resolved);
  res.writeHead(200, { "content-type": mime, "content-length": body.length });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const p = url.pathname;
  const method = req.method ?? "GET";
  let m: RegExpMatchArray | null;

  // CSRF guard for state-changing calls: browsers always attach an Origin
  // header to cross-site POSTs, so a foreign Origin means some web page is
  // trying to trigger local actions. Same-origin fetches carry the Studio
  // origin; non-browser clients (curl, scripts) send no Origin at all.
  if (method !== "GET") {
    const origin = req.headers.origin;
    if (
      typeof origin === "string" &&
      origin !== `http://${HOST}:${PORT}` &&
      origin !== `http://localhost:${PORT}`
    ) {
      throw new HttpError(403, "Cross-origin request rejected");
    }
  }

  if (p === "/api/state" && method === "GET") {
    return sendJson(res, 200, apiState());
  }

  if (p === "/api/intake" && method === "POST") {
    return sendJson(res, 201, apiCreateIntake(await readJsonBody(req)));
  }

  if ((m = p.match(/^\/api\/intake\/([^/]+)$/)) && method === "PUT") {
    return sendJson(res, 200, apiPutIntake(m[1], await readJsonBody(req)));
  }

  if ((m = p.match(/^\/api\/project\/([^/]+)\/meta$/)) && method === "PUT") {
    return sendJson(res, 200, apiPutProjectMeta(m[1], await readJsonBody(req)));
  }

  if ((m = p.match(/^\/api\/project\/([^/]+)\/prose$/)) && method === "PUT") {
    return sendJson(res, 200, apiPutProjectProse(m[1], await readJsonBody(req)));
  }

  if ((m = p.match(/^\/api\/screenshot\/([^/]+)$/))) {
    if (method === "POST") return sendJson(res, 201, await apiPostScreenshot(m[1], url, req));
    if (method === "DELETE") return sendJson(res, 200, apiDeleteScreenshot(m[1], url));
  }

  if ((m = p.match(/^\/api\/screenshot\/([^/]+)\/alt$/)) && method === "PUT") {
    return sendJson(res, 200, apiPutScreenshotAlt(m[1], await readJsonBody(req)));
  }

  if (p === "/api/theme") {
    if (method === "GET") return sendJson(res, 200, await apiGetTheme());
    if (method === "PUT") return sendJson(res, 200, await apiPutTheme(await readJsonBody(req)));
  }

  if (p === "/api/analyze" && method === "POST") {
    startAnalyze();
    return sendJson(res, 202, { started: true });
  }

  if (p === "/api/analyze/stream" && method === "GET") {
    return analyzeRunner.stream(res);
  }

  if (p === "/api/engine/status" && method === "GET") {
    return sendJson(res, 200, await apiEngineStatus(url));
  }

  if (p === "/api/engine/update" && method === "POST") {
    startEngineUpdate();
    return sendJson(res, 202, { started: true });
  }

  if (p === "/api/engine/stream" && method === "GET") {
    return engineRunner.stream(res);
  }

  if (p.startsWith("/api/")) throw new HttpError(404, `No such endpoint: ${method} ${p}`);

  // Static: screenshots referenced as "assets/..." from project docs.
  let decoded: string;
  try {
    decoded = decodeURIComponent(p);
  } catch {
    throw new HttpError(400, "Bad path encoding");
  }
  // Design tokens + font faces from the active site theme (single source of truth).
  if (decoded === "/theme.css" && method === "GET") {
    const body = Buffer.from(`:root{\n${themeCssVars()}\n}\n${themeFontFaces("/fonts")}\n`);
    res.writeHead(200, { "content-type": "text/css; charset=utf-8", "content-length": body.length });
    res.end(body);
    return;
  }

  if (decoded.startsWith("/fonts/") && method === "GET") {
    return serveFileWithin(SITE_FONTS_DIR, decoded.slice("/fonts/".length), res);
  }

  // Owner's manual — the language follows profile.sourceLang, falling back to
  // the English edition when no localized guide ships for that language.
  if (decoded === "/guide" && method === "GET") {
    let lang = "en";
    try {
      lang = loadProfile().sourceLang.startsWith("ja") ? "ja" : "en";
    } catch {
      /* unreadable profile → English guide */
    }
    const candidates = lang === "ja" ? ["GUIDE.ja.html", "GUIDE.html"] : ["GUIDE.html"];
    for (const name of candidates) {
      if (fs.existsSync(path.join(ROOT, name))) {
        return serveFileWithin(ROOT, name, res);
      }
    }
    throw new HttpError(404, "No guide file found (GUIDE.html)");
  }

  if (decoded.startsWith("/assets/") && method === "GET") {
    return serveFileWithin(path.join(DATA_DIR, "assets"), decoded.slice("/assets/".length), res);
  }

  if (method === "GET") {
    const rel = decoded === "/" ? "index.html" : decoded.slice(1);
    return serveFileWithin(PUBLIC_DIR, rel, res);
  }

  throw new HttpError(405, "Method not allowed");
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err) => {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err);
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: message });
    else res.end();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Provenfolio Studio → http://${HOST}:${PORT} (localhost only, never deployed)`);
});
