import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAuthor,
  noreplyUsername,
  authorKey,
  matchesIdentity,
} from "./author-identity.js";

// Non-ASCII fixtures are written as \u escapes so the file stays byte-exact:
// FULLWIDTH_NAME is "Neru" typed in full-width forms (U+FF2E U+FF45 ...),
// DECOMPOSED / PRECOMPOSED are the two Unicode spellings of "N-e-acute-ru".
const FULLWIDTH_NAME = "\uFF2E\uFF45\uFF52\uFF55";
const DECOMPOSED = "N\u0065\u0301ru";
const PRECOMPOSED = "N\u00E9ru";

// ---- normalizeAuthor ----

test("case drift normalizes to one spelling", () => {
  assert.equal(normalizeAuthor("Neru"), "neru");
  assert.equal(normalizeAuthor("NERU"), normalizeAuthor("neru"));
});

test("surrounding whitespace and a stray CR (CRLF tooling) are stripped", () => {
  assert.equal(normalizeAuthor("  Neru \r"), "neru");
  assert.equal(normalizeAuthor("Neru\r\n"), normalizeAuthor("Neru"));
});

test("internal whitespace runs collapse to a single space", () => {
  assert.equal(normalizeAuthor("Neru  Dev"), "neru dev");
  assert.equal(normalizeAuthor("Neru\t Dev"), normalizeAuthor("Neru Dev"));
});

test("NFKC: full-width letters equal their ASCII spelling", () => {
  assert.equal(normalizeAuthor(FULLWIDTH_NAME), "neru");
});

test("NFKC: composed and decomposed accented names compare equal", () => {
  assert.notEqual(DECOMPOSED, PRECOMPOSED); // fixtures really differ pre-normalization
  assert.equal(normalizeAuthor(DECOMPOSED), normalizeAuthor(PRECOMPOSED));
  assert.equal(normalizeAuthor(DECOMPOSED), "n\u00E9ru");
});

// ---- noreplyUsername ----

test("id-prefixed noreply form yields the username", () => {
  assert.equal(noreplyUsername("12345+neru@users.noreply.github.com"), "neru");
});

test("plain noreply form yields the same username", () => {
  assert.equal(noreplyUsername("neru@users.noreply.github.com"), "neru");
});

test("noreply parsing is itself normalization-aware", () => {
  assert.equal(
    noreplyUsername(" 12345+Neru@USERS.NOREPLY.GITHUB.COM "),
    "neru"
  );
});

test("a regular address is not a noreply", () => {
  assert.equal(noreplyUsername("neru@gmail.com"), undefined);
});

// ---- authorKey ----

test("case/whitespace drift in name and email maps to one author", () => {
  assert.equal(
    authorKey(" Neru\r", "Neru@GMAIL.com"),
    authorKey("neru", "neru@gmail.com")
  );
});

test("both GitHub noreply forms of one account map to one author", () => {
  assert.equal(
    authorKey("Neru", "12345+neru@users.noreply.github.com"),
    authorKey("neru", "neru@users.noreply.github.com")
  );
});

test("display-name changes on the same email map to one author", () => {
  assert.equal(
    authorKey("Neru", "neru@gmail.com"),
    authorKey("Neru Dev", "neru@gmail.com")
  );
});

test("different people stay distinct", () => {
  assert.notEqual(authorKey("a", "a@x.com"), authorKey("b", "b@x.com"));
  assert.notEqual(
    authorKey("alice", "1+alice@users.noreply.github.com"),
    authorKey("bob", "2+bob@users.noreply.github.com")
  );
});

test("same name on different emails stays distinct (no upward guessing)", () => {
  assert.notEqual(
    authorKey("Neru", "neru@gmail.com"),
    authorKey("Neru", "neru@work.example")
  );
});

test("empty email falls back to the normalized name", () => {
  assert.equal(authorKey(" Neru ", ""), authorKey("neru", ""));
  assert.notEqual(authorKey("alice", ""), authorKey("bob", ""));
});

// ---- matchesIdentity ----

test("no configured identities never matches", () => {
  assert.equal(matchesIdentity("Neru", "neru@gmail.com", []), false);
});

test("email identity matches despite case and whitespace drift", () => {
  assert.equal(
    matchesIdentity("whoever", " Neru@Gmail.com", ["neru@gmail.com"]),
    true
  );
});

test("name identity matches a full-width spelling of the same name", () => {
  assert.equal(matchesIdentity(FULLWIDTH_NAME, "x@y.example", ["neru"]), true);
});

test("name identity matches across composed/decomposed accents", () => {
  assert.equal(
    matchesIdentity(DECOMPOSED, "x@y.example", [PRECOMPOSED]),
    true
  );
});

test("bare username identity matches both noreply forms", () => {
  assert.equal(
    matchesIdentity("any", "12345+neru@users.noreply.github.com", ["Neru"]),
    true
  );
  assert.equal(
    matchesIdentity("any", "neru@users.noreply.github.com", ["neru"]),
    true
  );
});

test("noreply identity in one form matches a commit using the other form", () => {
  assert.equal(
    matchesIdentity("any", "neru@users.noreply.github.com", [
      "12345+neru@users.noreply.github.com",
    ]),
    true
  );
  assert.equal(
    matchesIdentity("any", "12345+neru@users.noreply.github.com", [
      "neru@users.noreply.github.com",
    ]),
    true
  );
});

test("a bare username identity does not match a regular email local part", () => {
  assert.equal(matchesIdentity("any", "neru@gmail.com", ["neru"]), false);
});

test("an unrelated author does not match", () => {
  assert.equal(
    matchesIdentity("Alice", "alice@x.com", ["neru", "neru@gmail.com"]),
    false
  );
});
