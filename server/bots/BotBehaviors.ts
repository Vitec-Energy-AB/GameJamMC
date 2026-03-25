import { Player, Match, SpawnedItem } from '../../shared/types';
import { BotDifficultyConfig } from './BotConfig';

const ATTACK_RANGE = 130; // px – same as hitbox width + player width
const ITEM_PICKUP_RANGE = 80; // px

// ── Helpers ──────────────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

/** Move the bot horizontally toward a target X position. */
function moveToward(bot: Player, targetX: number): void {
  if (targetX < bot.position.x - 5) {
    bot.inputState.left = true;
    bot.inputState.right = false;
    bot.facing = 'left';
  } else if (targetX > bot.position.x + 5) {
    bot.inputState.right = true;
    bot.inputState.left = false;
    bot.facing = 'right';
  } else {
    bot.inputState.left = false;
    bot.inputState.right = false;
  }
}

/** Stop horizontal movement. */
function stopMovement(bot: Player): void {
  bot.inputState.left = false;
  bot.inputState.right = false;
}

// ── Behavior functions ────────────────────────────────────────────────────────

/**
 * Patrol: wander randomly on platforms with jitter noise.
 */
export function patrol(bot: Player, match: Match, config: BotDifficultyConfig): void {
  // Apply movement jitter – random chance to flip direction
  if (Math.random() < config.movementJitter * 0.05) {
    bot.inputState.left = !bot.inputState.left;
    bot.inputState.right = !bot.inputState.right;
  }

  // Default: move right; reverse if near right edge of the map (approximate)
  const rightEdge = match.map.blastZones.right - 100;
  const leftEdge = match.map.blastZones.left + 100;

  if (bot.position.x > rightEdge) {
    bot.inputState.right = false;
    bot.inputState.left = true;
    bot.facing = 'left';
  } else if (bot.position.x < leftEdge) {
    bot.inputState.left = false;
    bot.inputState.right = true;
    bot.facing = 'right';
  } else if (!bot.inputState.left && !bot.inputState.right) {
    // Start moving in a random direction
    if (Math.random() < 0.5) {
      bot.inputState.right = true;
      bot.facing = 'right';
    } else {
      bot.inputState.left = true;
      bot.facing = 'left';
    }
  }
}

/**
 * Chase the target player.
 */
export function chaseTarget(bot: Player, target: Player, _match: Match, config: BotDifficultyConfig): void {
  if (Math.random() > config.aggressionLevel) return; // occasionally hesitate
  moveToward(bot, target.position.x);

  // Jump if the target is significantly above us and we are grounded
  if (target.position.y < bot.position.y - 80 && bot.isGrounded) {
    bot.inputState.jump = true;
  }
}

/**
 * Attack target: sets attack / useWeapon / throwBomb flags based on config accuracy.
 */
export function attackTarget(bot: Player, target: Player, config: BotDifficultyConfig, now: number): void {
  const d = dist(bot.position.x, bot.position.y, target.position.x, target.position.y);
  if (d > ATTACK_RANGE) return;

  // Face the target
  bot.facing = target.position.x >= bot.position.x ? 'right' : 'left';

  // Use weapon if available
  if (bot.currentWeapon) {
    if ((bot.weaponCooldownUntil ?? 0) <= now && Math.random() < config.attackAccuracy) {
      bot.inputState.useWeapon = true;
    }
    return;
  }

  // Throw bomb
  if (bot.bombCooldownUntil <= now && Math.random() < config.bombUsageChance) {
    bot.inputState.throwBomb = true;
    return;
  }

  // Plain melee
  if ((bot.attackCooldown ?? 0) <= now && Math.random() < config.attackAccuracy) {
    bot.inputState.attack = true;
  }
}

/**
 * Dodge an incoming threat (bomb or projectile nearby).
 * Moves in the opposite direction from the threat.
 */
export function dodgeThreat(bot: Player, threatX: number, config: BotDifficultyConfig): void {
  if (Math.random() > config.dodgeProbability) return;

  if (threatX < bot.position.x) {
    bot.inputState.right = true;
    bot.inputState.left = false;
  } else {
    bot.inputState.left = true;
    bot.inputState.right = false;
  }

  // Jump to dodge if grounded
  if (bot.isGrounded) {
    bot.inputState.jump = true;
  }
}

/**
 * Flee toward the center of the stage when near blast zones or lava.
 */
export function recoverToSafety(bot: Player, match: Match, config: BotDifficultyConfig): void {
  if (Math.random() > config.edgeAvoidance) return;

  const centerX = (match.map.blastZones.left + match.map.blastZones.right) / 2;
  moveToward(bot, centerX);

  // Jump if falling below a safe threshold (need upward movement)
  const safeY = match.map.blastZones.bottom - 200;
  if (bot.position.y > safeY && bot.isGrounded) {
    bot.inputState.jump = true;
  }
}

/**
 * Move toward a spawned item and request pickup.
 */
export function pickupItem(bot: Player, item: SpawnedItem, _match: Match, config: BotDifficultyConfig): void {
  if (Math.random() > config.itemPickupAwareness) return;

  moveToward(bot, item.position.x);

  const d = dist(bot.position.x, bot.position.y, item.position.x, item.position.y);
  if (d < ITEM_PICKUP_RANGE) {
    bot.inputState.pickup = true;
  }
}

/**
 * Attempt to block if an enemy is nearby and in attack range.
 */
export function tryBlock(bot: Player, target: Player, config: BotDifficultyConfig, now: number): void {
  const d = dist(bot.position.x, bot.position.y, target.position.x, target.position.y);
  if (d > ATTACK_RANGE * 1.5) return;

  if ((bot.blockCooldown ?? 0) <= now && Math.random() < config.blockSkill) {
    bot.inputState.block = true;
  } else {
    bot.inputState.block = false;
  }
}

export { dist, stopMovement, ATTACK_RANGE, ITEM_PICKUP_RANGE };
