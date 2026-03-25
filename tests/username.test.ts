import { normalizeUsername, NAME_MIN, NAME_MAX, DEFAULT_NAME, DEFAULT_SUGGESTION } from '../shared/username';

describe('normalizeUsername', () => {
  // ── Valid inputs ───────────────────────────────────────────────────────────
  test('returns a clean result for a simple valid name', () => {
    const result = normalizeUsername('Ada');
    expect(result.displayName).toBe('Ada');
    expect(result.nameKey).toBe('ada');
    expect(result.valid).toBe(true);
  });

  test('trims leading and trailing whitespace', () => {
    const result = normalizeUsername('  Alice  ');
    expect(result.displayName).toBe('Alice');
    expect(result.valid).toBe(true);
  });

  test('collapses multiple interior spaces', () => {
    const result = normalizeUsername('Ada   Lovelace');
    expect(result.displayName).toBe('Ada Lovelace');
    expect(result.valid).toBe(true);
  });

  test('nameKey is lowercased', () => {
    const result = normalizeUsername('GitMangoCoder');
    expect(result.nameKey).toBe('gitmangocoder');
    expect(result.valid).toBe(true);
  });

  test('allows digits, underscore and hyphen', () => {
    const result = normalizeUsername('Player_1-test');
    expect(result.valid).toBe(true);
    expect(result.displayName).toBe('Player_1-test');
  });

  test('exactly MIN_LENGTH characters is valid', () => {
    const name = 'A'.repeat(NAME_MIN);
    const result = normalizeUsername(name);
    expect(result.valid).toBe(true);
    expect(result.displayName).toBe(name);
  });

  test('exactly MAX_LENGTH characters is valid', () => {
    const name = 'A'.repeat(NAME_MAX);
    const result = normalizeUsername(name);
    expect(result.valid).toBe(true);
  });

  // ── Truncation ─────────────────────────────────────────────────────────────
  test('truncates input longer than MAX_LENGTH', () => {
    const long = 'A'.repeat(NAME_MAX + 10);
    const result = normalizeUsername(long);
    expect(result.displayName.length).toBe(NAME_MAX);
    expect(result.valid).toBe(true);
  });

  // ── Invalid inputs → fallback to DEFAULT_NAME ──────────────────────────────
  test('falls back to DEFAULT_NAME for empty string', () => {
    const result = normalizeUsername('');
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  test('falls back to DEFAULT_NAME for whitespace-only string', () => {
    const result = normalizeUsername('   ');
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  test('falls back for name shorter than MIN_LENGTH after trim', () => {
    const result = normalizeUsername('AB');
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  test('falls back for name with forbidden characters (angle bracket)', () => {
    const result = normalizeUsername('Ada<script>');
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  test('falls back for name with forbidden characters (semicolon)', () => {
    const result = normalizeUsername('Player;DROP');
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  test('falls back for non-string input (number)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeUsername(42 as any);
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  test('falls back for null input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = normalizeUsername(null as any);
    expect(result.displayName).toBe(DEFAULT_NAME);
    expect(result.valid).toBe(false);
  });

  // ── Constants ──────────────────────────────────────────────────────────────
  test('DEFAULT_SUGGESTION is a valid username', () => {
    const result = normalizeUsername(DEFAULT_SUGGESTION);
    expect(result.valid).toBe(true);
    expect(result.displayName).toBe(DEFAULT_SUGGESTION);
  });

  test('DEFAULT_NAME has correct value', () => {
    expect(DEFAULT_NAME).toBe('Player');
  });

  test('DEFAULT_SUGGESTION has correct value', () => {
    expect(DEFAULT_SUGGESTION).toBe('GitMangoCoder');
  });
});
