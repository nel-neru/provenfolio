/**
 * Author-identity normalization — the single definition of "same person" for
 * git-history attribution. Used by extract-git-stats for both the
 * single-author ownership fallback and profile.identities matching.
 *
 * Why this exists (each rule guards a real mis-attribution):
 *  - trim + internal-whitespace collapse: a `user.name` copied with a trailing
 *    space or a CR from CRLF tooling must not split one person in two.
 *  - Unicode NFKC: full-width/half-width and composed/decomposed spellings of
 *    the same name must compare equal.
 *  - toLowerCase (casefold approximation): "Neru" and "neru" are one person;
 *    email domains and practice make emails case-insensitive.
 *  - GitHub noreply forms: `12345+user@users.noreply.github.com` and
 *    `user@users.noreply.github.com` are the SAME GitHub account (the numeric
 *    id prefix was added when GitHub changed the format in 2017).
 *
 * Without this, a solo repo whose author strings drifted over time looks
 * multi-author and the no-identities single-author fallback reports
 * ownerCommitPct = 0%.
 */

/**
 * GitHub noreply address, matched AFTER normalization: optional numeric id
 * prefix, then the username (GitHub usernames are alphanumerics and hyphens).
 */
const NOREPLY_RE = /^(?:\d+\+)?([a-z0-9-]+)@users\.noreply\.github\.com$/;

/**
 * Canonical comparison form of an author name, email, or identity string:
 * Unicode NFKC, whitespace collapsed and trimmed, lowercased.
 */
export function normalizeAuthor(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * The GitHub username encoded in a noreply email, or undefined when the
 * address is not a GitHub noreply. Both noreply forms yield the same username.
 */
export function noreplyUsername(email: string): string | undefined {
  return NOREPLY_RE.exec(normalizeAuthor(email))?.[1];
}

/**
 * Stable grouping key for "this commit's author is the same person".
 * Precedence: GitHub account (both noreply forms collapse), then email
 * (git's practical identity — display names drift, addresses do not),
 * then name (only for commits with no email at all).
 */
export function authorKey(name: string, email: string): string {
  const username = noreplyUsername(email);
  if (username !== undefined) return `github:${username}`;
  const normEmail = normalizeAuthor(email);
  if (normEmail !== "") return `email:${normEmail}`;
  return `name:${normalizeAuthor(name)}`;
}

/**
 * Whether a commit author matches any configured identity. Identities may be
 * emails, display names, bare GitHub usernames, or either GitHub noreply
 * form; all comparisons are normalization-aware.
 */
export function matchesIdentity(
  authorName: string,
  authorEmail: string,
  identities: readonly string[]
): boolean {
  if (identities.length === 0) return false;
  const name = normalizeAuthor(authorName);
  const email = normalizeAuthor(authorEmail);
  const username = noreplyUsername(authorEmail);
  return identities.some((raw) => {
    const id = normalizeAuthor(raw);
    if (id === "") return false;
    if (email !== "" && id === email) return true;
    if (name !== "" && id === name) return true;
    // identity given as a bare GitHub username vs a noreply commit email
    if (username !== undefined && id === username) return true;
    // identity given as one noreply form, commit email using the other
    const idUsername = noreplyUsername(id);
    return idUsername !== undefined && idUsername === username;
  });
}
