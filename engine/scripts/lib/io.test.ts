import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readJson, ValidationFailure } from "./io.js";

let tmp: string;

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "provenfolio-io-"));
});

after(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("readJson returns the parsed value for a valid file", () => {
  const file = path.join(tmp, "ok.json");
  fs.writeFileSync(file, '{ "a": 1 }\n', "utf8");
  assert.deepEqual(readJson(file), { a: 1 });
});

test("readJson reports the file path when the JSON is broken", () => {
  const file = path.join(tmp, "broken.json");
  fs.writeFileSync(file, "{ not json", "utf8");
  assert.throws(
    () => readJson(file),
    (e: unknown) =>
      e instanceof ValidationFailure &&
      e.file === file &&
      e.message.includes(file) &&
      /invalid JSON/.test(e.message)
  );
});

test("readJson still surfaces filesystem errors (missing file)", () => {
  assert.throws(
    () => readJson(path.join(tmp, "nope.json")),
    /ENOENT/
  );
});
