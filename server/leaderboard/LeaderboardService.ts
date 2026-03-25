import { v4 as uuidv4 } from 'uuid';
import type { LeaderboardEntry, SubmitScoreRequest, SubmitScoreResponse } from '../../shared/leaderboard';
import { normalizeUsername } from '../../shared/username';
import type { ILeaderboardStore } from './ILeaderboardStore';

/** Maximum number of entries retained in the store (enforced at write time). */
export const MAX_ENTRIES = 100;

/**
 * Pure domain/service layer for the leaderboard.
 *
 * Sorting rules (documented and tested):
 *   1. score DESC         – higher is better
 *   2. createdAt ASC      – older submission wins on tie (first to achieve the score)
 *   3. id ASC             – final deterministic tie-break
 *
 * The service is decoupled from storage via ILeaderboardStore so tests can
 * inject an in-memory stub without touching the file system.
 */
export class LeaderboardService {
  constructor(private readonly store: ILeaderboardStore) {}

  /**
   * Returns the top `n` entries sorted by the canonical sort order.
   * Defaults to MAX_ENTRIES when n is not provided.
   */
  getTop(n: number = MAX_ENTRIES): LeaderboardEntry[] {
    let data;
    try {
      data = this.store.load();
    } catch (err) {
      console.warn('[leaderboard] store.load() failed in getTop:', err);
      return [];
    }
    return this.sort(data.entries).slice(0, n);
  }

  /**
   * Submits a new score entry.
   *
   * Idempotent: if the same runId has already been submitted the existing
   * entry is returned with `alreadySubmitted: true` and no data is written.
   *
   * Server-side validation:
   *   - score must be >= 0
   *   - name is normalised; invalid names fall back to "Player"
   */
  submitScore(req: SubmitScoreRequest): SubmitScoreResponse {
    const score = Math.max(0, Math.round(req.score));
    const { displayName, nameKey } = normalizeUsername(req.name);

    let data;
    try {
      data = this.store.load();
    } catch (err) {
      console.warn('[leaderboard] store.load() failed in submitScore:', err);
      data = { version: 1 as const, entries: [] };
    }

    // ── Idempotency check ────────────────────────────────────────────────────
    const existing = data.entries.find(e => e.runId === req.runId);
    if (existing) {
      return { entry: existing, alreadySubmitted: true };
    }

    const entry: LeaderboardEntry = {
      id: uuidv4(),
      runId: req.runId,
      name: displayName,
      nameKey,
      score,
      createdAt: new Date().toISOString(),
      gameVersion: req.gameVersion ?? '1.0.0',
    };

    data.entries.push(entry);

    // ── Enforce MAX_ENTRIES at write time ────────────────────────────────────
    data.entries = this.sort(data.entries).slice(0, MAX_ENTRIES);

    this.store.save(data);

    return { entry, alreadySubmitted: false };
  }

  /** Canonical sort: score DESC → createdAt ASC → id ASC */
  sort(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return [...entries].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }
}
