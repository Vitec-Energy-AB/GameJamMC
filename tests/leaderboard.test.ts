import { LeaderboardService, MAX_ENTRIES } from '../server/leaderboard/LeaderboardService';
import type { ILeaderboardStore } from '../server/leaderboard/ILeaderboardStore';
import type { LeaderboardData } from '../shared/leaderboard';

// ── In-memory stub ──────────────────────────────────────────────────────────
function makeStore(initial?: Partial<LeaderboardData>): ILeaderboardStore {
  let data: LeaderboardData = { version: 1, entries: [], ...initial };
  return {
    load: () => ({ ...data, entries: [...data.entries] }),
    save: (d) => { data = { ...d, entries: [...d.entries] }; },
  };
}

// ── Corruption-fallback stub ────────────────────────────────────────────────
function makeCorruptStore(): ILeaderboardStore {
  return {
    load: () => { throw new Error('corrupted'); },
    save: () => { /* no-op */ },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function submitN(service: LeaderboardService, n: number, scoreBase = 100) {
  for (let i = 0; i < n; i++) {
    service.submitScore({
      runId: `run-${i}`,
      name: `Player${i}`,
      score: scoreBase + i,
    });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('LeaderboardService.submitScore', () => {
  test('creates an entry with correct fields', () => {
    const service = new LeaderboardService(makeStore());
    const { entry, alreadySubmitted } = service.submitScore({
      runId: 'run-abc',
      name: 'TestPlayer',
      score: 200,
      gameVersion: '1.0.0',
    });

    expect(alreadySubmitted).toBe(false);
    expect(entry.runId).toBe('run-abc');
    expect(entry.name).toBe('TestPlayer');
    expect(entry.nameKey).toBe('testplayer');
    expect(entry.score).toBe(200);
    expect(entry.gameVersion).toBe('1.0.0');
    expect(typeof entry.id).toBe('string');
    expect(typeof entry.createdAt).toBe('string');
  });

  test('idempotent: duplicate runId returns existing entry with alreadySubmitted=true', () => {
    const service = new LeaderboardService(makeStore());
    const first = service.submitScore({ runId: 'run-dup', name: 'Alice', score: 100 });
    const second = service.submitScore({ runId: 'run-dup', name: 'Alice', score: 100 });

    expect(first.alreadySubmitted).toBe(false);
    expect(second.alreadySubmitted).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);
    expect(service.getTop().length).toBe(1);
  });

  test('normalises name: invalid name falls back to "Player"', () => {
    const service = new LeaderboardService(makeStore());
    const { entry } = service.submitScore({ runId: 'run-x', name: '!!', score: 50 });
    expect(entry.name).toBe('Player');
    expect(entry.nameKey).toBe('player');
  });

  test('clamps negative score to 0', () => {
    const service = new LeaderboardService(makeStore());
    const { entry } = service.submitScore({ runId: 'run-neg', name: 'Bob', score: -100 });
    expect(entry.score).toBe(0);
  });

  test('defaults gameVersion to "1.0.0" when omitted', () => {
    const service = new LeaderboardService(makeStore());
    const { entry } = service.submitScore({ runId: 'run-gv', name: 'Alice', score: 100 });
    expect(entry.gameVersion).toBe('1.0.0');
  });

  test('does not crash when store.load() throws (corruption fallback)', () => {
    const service = new LeaderboardService(makeCorruptStore());
    expect(() => {
      service.submitScore({ runId: 'run-crash', name: 'Bob', score: 50 });
    }).not.toThrow();
  });
});

describe('LeaderboardService.getTop', () => {
  test('returns empty array when no entries', () => {
    const service = new LeaderboardService(makeStore());
    expect(service.getTop(10)).toEqual([]);
  });

  test('respects the limit parameter', () => {
    const service = new LeaderboardService(makeStore());
    submitN(service, 5);
    expect(service.getTop(3).length).toBe(3);
  });

  test('returns all entries when limit > count', () => {
    const service = new LeaderboardService(makeStore());
    submitN(service, 3);
    expect(service.getTop(10).length).toBe(3);
  });
});

describe('LeaderboardService.sort – tie-break rules', () => {
  test('higher score comes first', () => {
    const service = new LeaderboardService(makeStore());
    service.submitScore({ runId: 'r1', name: 'Low', score: 100 });
    service.submitScore({ runId: 'r2', name: 'High', score: 300 });

    const top = service.getTop();
    expect(top[0].name).toBe('High');
    expect(top[1].name).toBe('Low');
  });

  test('equal score: earlier createdAt wins (ASC)', () => {
    const earlier = new Date('2024-01-01T10:00:00Z').toISOString();
    const later   = new Date('2024-01-01T11:00:00Z').toISOString();

    const entries = [
      { id: 'b', runId: 'r-b', name: 'B', nameKey: 'b', score: 200, createdAt: later,   gameVersion: '1.0.0' },
      { id: 'a', runId: 'r-a', name: 'A', nameKey: 'a', score: 200, createdAt: earlier, gameVersion: '1.0.0' },
    ];
    const service = new LeaderboardService(makeStore({ entries }));
    const top = service.getTop();

    expect(top[0].name).toBe('A'); // earlier = first
    expect(top[1].name).toBe('B');
  });

  test('equal score and createdAt: lower id wins (ASC)', () => {
    const ts = new Date('2024-01-01T10:00:00Z').toISOString();
    const entries = [
      { id: 'z-id', runId: 'r-z', name: 'Z', nameKey: 'z', score: 200, createdAt: ts, gameVersion: '1.0.0' },
      { id: 'a-id', runId: 'r-a', name: 'A', nameKey: 'a', score: 200, createdAt: ts, gameVersion: '1.0.0' },
    ];
    const service = new LeaderboardService(makeStore({ entries }));
    const top = service.getTop();

    expect(top[0].id).toBe('a-id');
    expect(top[1].id).toBe('z-id');
  });
});

describe('LeaderboardService – MAX_ENTRIES enforcement', () => {
  test(`store is trimmed to at most ${MAX_ENTRIES} entries`, () => {
    const service = new LeaderboardService(makeStore());
    submitN(service, MAX_ENTRIES + 20);
    expect(service.getTop(MAX_ENTRIES + 20).length).toBe(MAX_ENTRIES);
  });

  test('lowest-score entries are dropped when limit is reached', () => {
    const service = new LeaderboardService(makeStore());

    // Fill up to MAX_ENTRIES with score 100 each
    submitN(service, MAX_ENTRIES, 100);

    // Submit one with very high score
    service.submitScore({ runId: 'high', name: 'Champion', score: 9999 });

    const top = service.getTop(1);
    expect(top[0].name).toBe('Champion');

    // Total should still be MAX_ENTRIES
    expect(service.getTop(MAX_ENTRIES + 10).length).toBe(MAX_ENTRIES);
  });
});

describe('FileLeaderboardStore – corruption fallback (via LeaderboardService)', () => {
  test('returns empty leaderboard when store throws on load', () => {
    const service = new LeaderboardService(makeCorruptStore());
    const top = service.getTop();
    expect(top).toEqual([]);
  });
});
