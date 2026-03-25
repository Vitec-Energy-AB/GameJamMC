import { Router } from 'express';
import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { LeaderboardService } from './LeaderboardService';
import type { SubmitScoreRequest } from '../../shared/leaderboard';

/**
 * Creates an Express router that exposes the leaderboard REST API.
 *
 * Routes:
 *   GET  /api/leaderboard          – fetch top entries (query: ?limit=10)
 *   POST /api/leaderboard/submit   – submit a new score (server-internal use only –
 *                                    clients never call this directly; the server
 *                                    submits scores after each match ends)
 */
export function createLeaderboardRouter(service: LeaderboardService): Router {
  const router = Router();

  // Modest rate limit: 60 reads per minute per IP
  const readLimit = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Tight limit for writes: 10 per minute per IP (server submits automatically,
  // so legitimate traffic should never hit this)
  const writeLimit = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * GET /api/leaderboard
   * Query params:
   *   limit  – number of entries to return (1–100, default 10)
   */
  router.get('/', readLimit, (_req: Request, res: Response) => {
    try {
      const raw = String(_req.query.limit ?? '10');
      const limit = Math.min(100, Math.max(1, parseInt(raw, 10) || 10));
      const entries = service.getTop(limit);
      res.json({ entries });
    } catch (err) {
      console.error('[leaderboard] GET error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/leaderboard/submit
   * Body: SubmitScoreRequest
   *
   * Note: Scores are submitted by the server after each match, not directly
   * by clients.  This endpoint remains available for testing / admin use but
   * is rate-limited.
   */
  router.post('/submit', writeLimit, (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<SubmitScoreRequest>;

      if (!body.runId || typeof body.runId !== 'string') {
        res.status(400).json({ error: 'runId is required' });
        return;
      }
      if (!body.name || typeof body.name !== 'string') {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      if (typeof body.score !== 'number' || body.score < 0 || !Number.isFinite(body.score)) {
        res.status(400).json({ error: 'score must be a non-negative finite number' });
        return;
      }

      const result = service.submitScore({
        runId: body.runId,
        name: body.name,
        score: body.score,
        gameVersion: body.gameVersion,
      });

      res.status(result.alreadySubmitted ? 200 : 201).json(result);
    } catch (err) {
      console.error('[leaderboard] POST /submit error', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
