/**
 * Username normalisation and validation rules shared between server and tests.
 *
 * Rules:
 *  - trim() leading/trailing whitespace
 *  - collapse multiple inner spaces to a single space
 *  - allowed characters: letters (any Unicode letter), ASCII digits, space, _ and -
 *  - minimum length: NAME_MIN (3) after normalisation
 *  - maximum length: NAME_MAX (20) after normalisation (truncated if exceeded before length check fails)
 *  - if invalid / empty after normalisation → fall back to DEFAULT_NAME ("Player")
 *  - nameKey = normalised display name lowercased (used for deduplication / lookup)
 */

export const NAME_MIN = 3;
export const NAME_MAX = 20;
/** Suggested username when no previous session exists */
export const DEFAULT_SUGGESTION = 'GitMangoCoder';
/** Fallback display name when input is invalid */
export const DEFAULT_NAME = 'Player';

/** Allowed characters: Unicode letters, ASCII digits, space, underscore, hyphen */
const ALLOWED_RE = /^[\p{L}0-9 _-]+$/u;

export interface NormalizeResult {
  /** Name to display in the UI */
  displayName: string;
  /** Lower-cased normalised value – use for dedup / lookup */
  nameKey: string;
  /** false when the input was invalid and the fallback DEFAULT_NAME was used */
  valid: boolean;
}

/**
 * Normalises a raw username input and returns the validated result.
 * Never throws – always returns a usable displayName.
 */
export function normalizeUsername(input: string): NormalizeResult {
  if (typeof input !== 'string') {
    return { displayName: DEFAULT_NAME, nameKey: DEFAULT_NAME.toLowerCase(), valid: false };
  }

  // 1. Trim outer whitespace
  let name = input.trim();

  // 2. Collapse multiple inner spaces
  name = name.replace(/\s+/g, ' ');

  // 3. Enforce max length (soft truncate before hard validation)
  if (name.length > NAME_MAX) {
    name = name.slice(0, NAME_MAX).trim();
  }

  // 4. Validate
  const valid =
    name.length >= NAME_MIN &&
    name.length <= NAME_MAX &&
    ALLOWED_RE.test(name);

  if (!valid) {
    return { displayName: DEFAULT_NAME, nameKey: DEFAULT_NAME.toLowerCase(), valid: false };
  }

  return { displayName: name, nameKey: name.toLowerCase(), valid: true };
}
