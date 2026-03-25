import { Player, Match, Platform } from '../../shared/types';
import { BotDifficultyConfig } from './BotConfig';

// Physics constants mirroring the game engine
const JUMP_VELOCITY = 600; // absolute value (engine uses -600 for upward thrust)
const GRAVITY = 980;

/** Maximum height a bot can reach in one jump (v² / 2g). */
export const MAX_SINGLE_JUMP_HEIGHT = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY); // ≈ 183.67 px

/** Approximate half-height of a player sprite used for feet-offset calculations. */
const PLAYER_HALF_HEIGHT = 30;

/**
 * Find the platform directly beneath the bot (within a small tolerance).
 * Returns null when the bot is airborne with nothing below.
 */
export function findNearestPlatform(bot: Player, match: Match): Platform | null {
  let best: Platform | null = null;
  let bestDist = Infinity;

  const feetY = bot.position.y + PLAYER_HALF_HEIGHT;

  for (const p of match.map.platforms) {
    const dist = p.y - feetY; // positive = platform top is below feet

    // Allow ≤5 px overlap (bot foot just inside the platform) and ≤40 px gap below
    if (dist < -5 || dist > 40) continue;

    // Allow 15 px horizontal margin for edge-of-platform detection
    if (bot.position.x < p.x - 15 || bot.position.x > p.x + p.width + 15) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }

  return best;
}

/**
 * Returns true if the bot can reach the top surface of the given platform
 * using its currently available jumps.
 */
export function canReachPlatform(bot: Player, platform: Platform): boolean {
  const heightDiff = bot.position.y - platform.y; // positive = platform is above

  // Platform is at same level or below – always reachable by walking/falling
  if (heightDiff <= 0) return true;

  const jumps = Math.max(bot.jumpsRemaining, bot.isGrounded ? 1 : 0);
  const maxReach = MAX_SINGLE_JUMP_HEIGHT * jumps;

  // +20 px tolerance compensates for player collision-box height variation
  return heightDiff <= maxReach + 20;
}

/**
 * Find the best intermediate platform to hop to when navigating toward
 * (targetX, targetY). Returns null if the target is directly reachable
 * or if no useful intermediate platform exists.
 */
export function findPlatformToward(
  bot: Player,
  targetX: number,
  targetY: number,
  match: Match,
): Platform | null {
  // Only needed when the target is significantly above the bot
  const targetIsAbove = targetY < bot.position.y - 60;
  if (!targetIsAbove) return null;

  let best: Platform | null = null;
  let bestScore = -Infinity;

  for (const p of match.map.platforms) {
    const platTopY = p.y;
    const platCenterX = p.x + p.width / 2;

    // Platform must be above the bot's current position
    if (platTopY >= bot.position.y - 20) continue;

    // Skip platforms that are higher than the target (overshoot)
    if (platTopY < targetY - 30) continue;

    // Must be reachable
    if (!canReachPlatform(bot, p)) continue;

    // Score: prefer platforms that are high up and horizontally close to the target path.
    // bestScore starts at -Infinity, so any valid platform will set the initial best.
    const heightGain = bot.position.y - platTopY;
    const xDist = Math.abs(platCenterX - targetX);
    const score = heightGain / 100 - xDist / 300;

    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best;
}

/**
 * Navigate the bot toward (targetX, targetY) using platform awareness.
 * Sets inputState movement and jump flags but does NOT override attack/block.
 */
export function navigateToTarget(
  bot: Player,
  targetX: number,
  targetY: number,
  match: Match,
  config: BotDifficultyConfig,
): void {
  const dx = targetX - bot.position.x;
  const dy = bot.position.y - targetY; // positive = target is above bot

  // Horizontal movement toward target
  if (Math.abs(dx) > 10) {
    if (dx > 0) {
      bot.inputState.right = true;
      bot.inputState.left = false;
      bot.facing = 'right';
    } else {
      bot.inputState.left = true;
      bot.inputState.right = false;
      bot.facing = 'left';
    }
  }

  // Jump logic when target is significantly above
  if (dy > 60) {
    const jumpsAvailable = bot.isGrounded ? Math.max(bot.jumpsRemaining, 1) : bot.jumpsRemaining;

    if (jumpsAvailable > 0) {
      // Smart bots find intermediate platforms; weaker bots jump directly
      if (config.platformNavigationSkill >= 0.4) {
        const platform = findPlatformToward(bot, targetX, targetY, match);
        if (platform) {
          // Steer toward the intermediate platform's center
          const platCenterX = platform.x + platform.width / 2;
          const pdx = platCenterX - bot.position.x;
          if (Math.abs(pdx) > 10) {
            if (pdx > 0) {
              bot.inputState.right = true;
              bot.inputState.left = false;
              bot.facing = 'right';
            } else {
              bot.inputState.left = true;
              bot.inputState.right = false;
              bot.facing = 'left';
            }
          }
          bot.inputState.jump = true;
          return;
        }
      }

      // Fall back: jump directly if within reach
      const maxReach = MAX_SINGLE_JUMP_HEIGHT * jumpsAvailable;
      if (dy <= maxReach + 20) {
        bot.inputState.jump = true;
      }
    }
  }
}
