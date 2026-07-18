import test from "node:test";
import assert from "node:assert/strict";
import { formatClaudeStreamLine } from "./claude-stream-log.js";

const j = (event: unknown): string => JSON.stringify(event);

test("empty and whitespace lines produce nothing", () => {
  assert.deepEqual(formatClaudeStreamLine(""), []);
  assert.deepEqual(formatClaudeStreamLine("   "), []);
});

test("non-JSON lines pass through untouched (plain-text CLI fallback)", () => {
  assert.deepEqual(formatClaudeStreamLine("cloning repo..."), ["cloning repo..."]);
});

test("unparseable JSON-looking lines pass through", () => {
  assert.deepEqual(formatClaudeStreamLine("{not json"), ["{not json"]);
});

test("init event becomes a session-started line with the model when present", () => {
  assert.deepEqual(
    formatClaudeStreamLine(j({ type: "system", subtype: "init", model: "claude-opus-4-8" })),
    ["[claude] session started (claude-opus-4-8)"]
  );
  assert.deepEqual(
    formatClaudeStreamLine(j({ type: "system", subtype: "init", tools: [] })),
    ["[claude] session started"]
  );
});

test("thinking-token counters and rate-limit heartbeats are dropped", () => {
  assert.deepEqual(
    formatClaudeStreamLine(j({ type: "system", subtype: "thinking_tokens", estimated_tokens: 5 })),
    []
  );
  assert.deepEqual(
    formatClaudeStreamLine(j({ type: "rate_limit_event", rate_limit_info: { status: "allowed" } })),
    []
  );
});

test("post_turn_summary status_detail becomes a progress line", () => {
  assert.deepEqual(
    formatClaudeStreamLine(
      j({ type: "system", subtype: "post_turn_summary", status_detail: "cloned the repo" })
    ),
    ["[claude] cloned the repo"]
  );
  assert.deepEqual(
    formatClaudeStreamLine(j({ type: "system", subtype: "post_turn_summary", status_detail: " " })),
    []
  );
});

test("assistant tool_use renders one arrow line with the best input detail", () => {
  const event = {
    type: "assistant",
    message: {
      content: [
        { type: "tool_use", name: "Bash", input: { command: "git clone https://x" } },
        { type: "tool_use", name: "Read", input: { file_path: "engine/scripts/emit.ts" } },
        { type: "tool_use", name: "Task", input: { description: "analyze repo", prompt: "..." } },
      ],
    },
  };
  assert.deepEqual(formatClaudeStreamLine(j(event)), [
    "→ Bash git clone https://x",
    "→ Read engine/scripts/emit.ts",
    "→ Task analyze repo",
  ]);
});

test("long tool input is clipped to one line", () => {
  const event = {
    type: "assistant",
    message: {
      content: [{ type: "tool_use", name: "Bash", input: { command: `a\nb${"x".repeat(300)}` } }],
    },
  };
  const [line] = formatClaudeStreamLine(j(event));
  assert.ok(line!.length <= "→ Bash ".length + 120);
  assert.ok(line!.startsWith("→ Bash a b"));
  assert.ok(line!.endsWith("…"));
});

test("subagent tool_use is indented; subagent text is dropped", () => {
  const event = {
    type: "assistant",
    parent_tool_use_id: "toolu_123",
    message: {
      content: [
        { type: "text", text: "internal narration" },
        { type: "tool_use", name: "Grep", input: { pattern: "TODO" } },
      ],
    },
  };
  assert.deepEqual(formatClaudeStreamLine(j(event)), ["  → Grep TODO"]);
});

test("top-level assistant text is kept, thinking is dropped, blank lines removed", () => {
  const event = {
    type: "assistant",
    message: {
      content: [
        { type: "thinking", thinking: "hmm" },
        { type: "text", text: "step one done\n\nstep two next" },
      ],
    },
  };
  assert.deepEqual(formatClaudeStreamLine(j(event)), ["step one done", "step two next"]);
});

test("long assistant text is capped with a hidden-lines marker", () => {
  const text = Array.from({ length: 12 }, (_, i) => `line ${i + 1}`).join("\n");
  const out = formatClaudeStreamLine(
    j({ type: "assistant", message: { content: [{ type: "text", text }] } })
  );
  assert.equal(out.length, 9);
  assert.equal(out[8], "… (+4 more lines)");
});

test("successful tool_result events are dropped; errors surface", () => {
  const ok = {
    type: "user",
    message: { content: [{ type: "tool_result", content: "all good" }] },
  };
  assert.deepEqual(formatClaudeStreamLine(j(ok)), []);

  const errString = {
    type: "user",
    message: { content: [{ type: "tool_result", is_error: true, content: "ENOENT: missing" }] },
  };
  assert.deepEqual(formatClaudeStreamLine(j(errString)), ["✗ tool error: ENOENT: missing"]);

  const errBlocks = {
    type: "user",
    message: {
      content: [
        {
          type: "tool_result",
          is_error: true,
          content: [{ type: "text", text: "lint failed" }, { type: "image" }],
        },
      ],
    },
  };
  assert.deepEqual(formatClaudeStreamLine(j(errBlocks)), ["✗ tool error: lint failed"]);
});

test("result event renders stats and the final text", () => {
  const event = {
    type: "result",
    subtype: "success",
    num_turns: 42,
    duration_ms: 913_000,
    result: "Analyzed 1 project.\nEmit complete.",
  };
  assert.deepEqual(formatClaudeStreamLine(j(event)), [
    "[claude] success (42 turns, 913s)",
    "Analyzed 1 project.",
    "Emit complete.",
  ]);
});

test("result event without stats or text still closes the log", () => {
  assert.deepEqual(formatClaudeStreamLine(j({ type: "result" })), ["[claude] done"]);
});

test("unknown event types are dropped", () => {
  assert.deepEqual(formatClaudeStreamLine(j({ type: "mystery", payload: 1 })), []);
});
