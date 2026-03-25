import fs from 'fs';
import path from 'path';
import type { LeaderboardData, LeaderboardEntry } from '../../shared/leaderboard';
import type { ILeaderboardStore } from './ILeaderboardStore';

const CURRENT_VERSION = 1 as const;

function emptyData(): LeaderboardData {
  return { version: CURRENT_VERSION, entries: [] };
}

/**
 * JSON-file-based leaderboard store.
 *
 * Data is stored in a single JSON file.  All operations are synchronous
 * (read-modify-write in one step) which is safe for a single Node.js process.
 *
 * Corruption is handled gracefully: any parse or schema error resets the store
 * to an empty state and logs a warning rather than crashing.
 */
export class FileLeaderboardStore implements ILeaderboardStore {
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath ?? (process.env['LEADERBOARD_FILE'] || path.join(process.cwd(), 'data', 'leaderboard.json'));
    this.ensureDir();
  }

  private ensureDir(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load(): LeaderboardData {
    try {
      if (!fs.existsSync(this.filePath)) return emptyData();
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      return this.validate(parsed);
    } catch (err) {
      console.warn('[leaderboard] Failed to load data – resetting to empty state.', err);
      return emptyData();
    }
  }

  save(data: LeaderboardData): void {
    try {
      this.ensureDir();
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[leaderboard] Failed to save data.', err);
    }
  }

  /**
   * Runtime schema validation with migration support.
   * Returns a clean LeaderboardData or throws so the caller can fall back.
   */
  private validate(raw: unknown): LeaderboardData {
    if (typeof raw !== 'object' || raw === null) throw new Error('not an object');

    const obj = raw as Record<string, unknown>;

    // ── Migrations ────────────────────────────────────────────────────────────
    // (placeholder for future v1 → v2 etc.)
    // if (obj.version === undefined) { /* migrate from pre-versioned format */ }

    if (obj.version !== CURRENT_VERSION) {
      console.warn(`[leaderboard] Unknown data version "${obj.version}" – resetting.`);
      return emptyData();
    }

    if (!Array.isArray(obj.entries)) throw new Error('entries is not an array');

    const entries = (obj.entries as unknown[]).filter((e): e is LeaderboardEntry => {
      if (typeof e !== 'object' || e === null) return false;
      const entry = e as Record<string, unknown>;
      return (
        typeof entry.id === 'string' &&
        typeof entry.runId === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.nameKey === 'string' &&
        typeof entry.score === 'number' &&
        entry.score >= 0 &&
        typeof entry.createdAt === 'string' &&
        typeof entry.gameVersion === 'string'
      );
    });

    return { version: CURRENT_VERSION, entries };
  }
}
