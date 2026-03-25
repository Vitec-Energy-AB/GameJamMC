// Shared leaderboard types used by both server and client.

export interface LeaderboardEntry {
  /** UUID v4 – unique per submission */
  id: string;
  /** Idempotency key – one UUID per game run; duplicate runIds are silently ignored */
  runId: string;
  /** Display name shown in the UI */
  name: string;
  /** Lower-cased normalised name used for deduplication / lookup */
  nameKey: string;
  /** Non-negative integer score */
  score: number;
  /** ISO-8601 timestamp of submission */
  createdAt: string;
  /** Semantic version of the game at time of submission */
  gameVersion: string;
}

/**
 * Root blob stored on disk.
 * Bump `version` whenever the schema changes and add a migration in FileLeaderboardStore.
 */
export interface LeaderboardData {
  version: 1;
  entries: LeaderboardEntry[];
}

/** Shape of the POST /api/leaderboard/submit request body */
export interface SubmitScoreRequest {
  runId: string;
  name: string;
  score: number;
  gameVersion?: string;
}

/** Shape of the POST /api/leaderboard/submit response */
export interface SubmitScoreResponse {
  entry: LeaderboardEntry;
  alreadySubmitted: boolean;
}
