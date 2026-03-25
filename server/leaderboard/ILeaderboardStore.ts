import type { LeaderboardData } from '../../shared/leaderboard';

/** Minimal read/write contract for leaderboard persistence. */
export interface ILeaderboardStore {
  /** Load the current leaderboard data. Never throws – returns a valid default on error. */
  load(): LeaderboardData;
  /** Atomically persist leaderboard data. */
  save(data: LeaderboardData): void;
}
