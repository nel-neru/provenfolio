/**
 * Formatter for `claude -p --output-format stream-json --verbose` output.
 *
 * Studio's "run analysis" button launches the claude CLI headless; in plain
 * print mode nothing reaches stdout until the whole pipeline finishes, so the
 * Studio log looks hung for a 10-30 minute run. stream-json emits one JSON
 * event per line as the run progresses — this module turns those events into
 * short human-readable log lines and drops the high-frequency noise
 * (thinking-token counters, rate-limit heartbeats, extended thinking blocks,
 * subagent narration).
 *
 * Non-JSON lines pass through untouched, so a CLI that prints plain text
 * degrades to the previous line-by-line behavior.
 */

type JsonRecord = Record<string, unknown>;

/** Longest rendered detail for a tool call / status line. */
const DETAIL_MAX = 120;
/** Assistant/result text is capped at this many lines per event. */
const TEXT_LINES_MAX = 8;

function clip(value: string, max: number): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : undefined;
}

/** Pick the most descriptive string field of a tool input for the log line. */
function summarizeToolInput(input: JsonRecord | undefined): string {
  if (!input) return "";
  for (const key of [
    "command",
    "file_path",
    "pattern",
    "description",
    "skill",
    "query",
    "url",
    "prompt",
  ]) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return ` ${clip(value, DETAIL_MAX)}`;
  }
  return "";
}

/** Extract readable text from a tool_result content value (string or blocks). */
function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        const rec = asRecord(block);
        return rec && rec.type === "text" && typeof rec.text === "string" ? rec.text : "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/** Cap multi-line text, keeping the head and noting what was dropped. */
function capLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);
  if (lines.length <= TEXT_LINES_MAX) return lines;
  const hidden = lines.length - TEXT_LINES_MAX;
  return [...lines.slice(0, TEXT_LINES_MAX), `… (+${hidden} more lines)`];
}

/**
 * Convert one raw stdout line from the claude CLI into zero or more Studio
 * log lines. Unknown event types are dropped; unparseable lines pass through.
 */
export function formatClaudeStreamLine(rawLine: string): string[] {
  const line = rawLine.trim();
  if (!line) return [];
  if (!line.startsWith("{")) return [rawLine];

  let event: JsonRecord;
  try {
    event = JSON.parse(line) as JsonRecord;
  } catch {
    return [rawLine];
  }

  switch (event.type) {
    case "system": {
      if (event.subtype === "init") {
        const model = typeof event.model === "string" ? ` (${event.model})` : "";
        return [`[claude] session started${model}`];
      }
      // Per-turn status one-liners are the best progress signal the stream has.
      if (event.subtype === "post_turn_summary" && typeof event.status_detail === "string") {
        const detail = event.status_detail.trim();
        return detail ? [`[claude] ${clip(detail, DETAIL_MAX)}`] : [];
      }
      // thinking_tokens counters and other system chatter.
      return [];
    }

    case "assistant": {
      const message = asRecord(event.message);
      const content = Array.isArray(message?.content) ? message.content : [];
      const fromSubagent = typeof event.parent_tool_use_id === "string";
      const out: string[] = [];
      for (const rawBlock of content) {
        const block = asRecord(rawBlock);
        if (!block) continue;
        if (block.type === "tool_use") {
          const name = typeof block.name === "string" ? block.name : "tool";
          const prefix = fromSubagent ? "  → " : "→ ";
          out.push(`${prefix}${name}${summarizeToolInput(asRecord(block.input))}`);
        } else if (block.type === "text" && !fromSubagent) {
          // Subagent narration is internal detail; top-level text is the
          // pipeline talking to the owner.
          if (typeof block.text === "string" && block.text.trim()) {
            out.push(...capLines(block.text));
          }
        }
        // thinking blocks are never logged.
      }
      return out;
    }

    case "user": {
      // Tool results are noise except when a tool failed.
      const message = asRecord(event.message);
      const content = Array.isArray(message?.content) ? message.content : [];
      const out: string[] = [];
      for (const rawBlock of content) {
        const block = asRecord(rawBlock);
        if (!block || block.type !== "tool_result" || block.is_error !== true) continue;
        const text = toolResultText(block.content);
        out.push(`✗ tool error: ${text ? clip(text, DETAIL_MAX) : "(no detail)"}`);
      }
      return out;
    }

    case "result": {
      const subtype = typeof event.subtype === "string" ? event.subtype : "done";
      const turns = typeof event.num_turns === "number" ? `${event.num_turns} turns` : "";
      const secs =
        typeof event.duration_ms === "number"
          ? `${Math.round(event.duration_ms / 1000)}s`
          : "";
      const stats = [turns, secs].filter(Boolean).join(", ");
      const out = [`[claude] ${subtype}${stats ? ` (${stats})` : ""}`];
      if (typeof event.result === "string" && event.result.trim()) {
        out.push(...capLines(event.result));
      }
      return out;
    }

    default:
      // rate_limit_event and anything future-shaped.
      return [];
  }
}
