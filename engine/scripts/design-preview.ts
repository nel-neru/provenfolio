/**
 * Design-proposal preview — a tiny static server for the /design skill.
 *
 * Serves the proposal gallery that "/design propose" writes under
 * workspace/design/proposals/ (workspace/ is transient: gitignored, safe to
 * delete, always regenerable). LOCALHOST ONLY (binds 127.0.0.1). Never
 * deployed. No dependencies beyond node builtins.
 *
 * Usage: tsx engine/scripts/design-preview.ts   (or: npm run design:preview)
 */
import http from "node:http";
import type { ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

import { ROOT } from "./lib/paths.js";

const HOST = "127.0.0.1";
const PORT = 4700;
// Host header values a local browser can legitimately send when talking to
// this server (same DNS-rebinding guard as studio/server.ts). A rebinding
// page is served from an attacker-owned domain whose DNS record is then
// re-pointed at 127.0.0.1 — the browser happily reaches this server and
// same-origin policy no longer helps, but the Host header still names the
// attacker's domain. Allowlisting Host on every request shuts that down.
const ALLOWED_HOSTS = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`, `[::1]:${PORT}`]);
const PROPOSALS_DIR = path.join(ROOT, "workspace", "design", "proposals");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

/** Shown when workspace/design/proposals/ (or its index.html) doesn't exist yet. */
const NO_PROPOSALS_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Design proposals</title>
</head>
<body style="font-family: system-ui, sans-serif; max-width: 38rem; margin: 4rem auto; padding: 0 1rem; line-height: 1.6;">
  <h1 style="font-size: 1.4rem;">No design proposals yet</h1>
  <p>Nothing exists under <code>workspace/design/proposals/</code>.</p>
  <p>Run <code>/design propose</code> in Claude Code to generate proposals, then reload this page.</p>
</body>
</html>
`;

function sendText(res: ServerResponse, status: number, mime: string, body: string): void {
  const buf = Buffer.from(body);
  res.writeHead(status, { "content-type": mime, "content-length": buf.length });
  res.end(buf);
}

/** Path-traversal-safe static file serving (same pattern as studio/server.ts). */
function serveFileWithin(rootDir: string, relPath: string, res: ServerResponse): void {
  const resolved = path.resolve(rootDir, "." + path.posix.normalize("/" + relPath));
  if (resolved !== path.resolve(rootDir) && !resolved.startsWith(path.resolve(rootDir) + path.sep)) {
    sendText(res, 403, "text/plain; charset=utf-8", "Forbidden");
    return;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    // Missing gallery (or missing proposals dir entirely) is a normal state,
    // not an error — explain what to do instead of a bare 404.
    if (path.basename(resolved) === "index.html") {
      sendText(res, 200, "text/html; charset=utf-8", NO_PROPOSALS_PAGE);
      return;
    }
    sendText(res, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }
  const mime = MIME[path.extname(resolved).toLowerCase()] ?? "application/octet-stream";
  const body = fs.readFileSync(resolved);
  res.writeHead(200, { "content-type": mime, "content-length": body.length });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // One guard around the whole handler: a malformed request-target (e.g.
  // "//[") throws in `new URL`, and an uncaught throw would kill the server.
  try {
    // DNS-rebinding guard: refuse any request whose Host header is not a
    // known local name for this server (see ALLOWED_HOSTS).
    const host = req.headers.host;
    if (typeof host !== "string" || !ALLOWED_HOSTS.has(host.toLowerCase())) {
      sendText(res, 403, "text/plain; charset=utf-8", "Unrecognized Host header");
      return;
    }
    if ((req.method ?? "GET") !== "GET") {
      sendText(res, 405, "text/plain; charset=utf-8", "Method not allowed");
      return;
    }
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
    let decoded: string;
    try {
      decoded = decodeURIComponent(url.pathname);
    } catch {
      sendText(res, 400, "text/plain; charset=utf-8", "Bad path encoding");
      return;
    }
    const rel = decoded === "/" ? "index.html" : decoded.slice(1);
    serveFileWithin(PROPOSALS_DIR, rel, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      sendText(res, 500, "text/plain; charset=utf-8", "Internal error");
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `Design proposals → http://${HOST}:${PORT} (localhost only, never deployed; serving workspace/design/proposals/)`
  );
});
