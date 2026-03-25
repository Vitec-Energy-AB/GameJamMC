import { Player, Match, SpawnedItem } from '../../shared/types';
import { BotDifficultyConfig } from './BotConfig';
import {
  navigateToTarget,
  canReachPlatform,
  MAX_SINGLE_JUMP_HEIGHT,
} from './BotNavigation';

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
 * Patrol: move toward strategic map positions (center, item spawns, platforms)
 * instead of wandering randomly.
 */
export function patrol(bot: Player, match: Match, config: BotDifficultyConfig): void {
  const bz = match.map.blastZones;
  const rightEdge = bz.right - 100;
  const leftEdge = bz.left + 100;

  // Smart bots move toward strategic positions
  if (config.platformNavigationSkill >= 0.4 || config.itemPickupAwareness >= 0.5) {
    // Prefer active items
    const activeItems = match.items.filter(i => i.active);
    if (activeItems.length > 0 && config.itemPickupAwareness >= 0.4) {
      let closest = activeItems[0];
      let closestDist = Math.abs(activeItems[0].position.x - bot.position.x);
      for (const item of activeItems) {
        const d = Math.abs(item.position.x - bot.position.x);
        if (d < closestDist) { closestDist = d; closest = item; }
      }
      navigateToTarget(bot, closest.position.x, closest.position.y, match, config);
      return;
    }

    // Move toward item spawn points or center stage
    if (match.map.itemSpawnPoints.length > 0 && config.platformNavigationSkill >= 0.4) {
      // Rotate through spawn points based on time to vary patrol pattern
      const spawnIdx = Math.floor(Date.now() / 5000) % match.map.itemSpawnPoints.length;
      const sp = match.map.itemSpawnPoints[spawnIdx];
      navigateToTarget(bot, sp.x, sp.y, match, config);
      return;
    }

    // Fall back to center stage
    const centerX = (bz.left + bz.right) / 2;
    const centerY = (bz.top + bz.bottom) / 2;
    navigateToTarget(bot, centerX, centerY, match, config);
    return;
  }

  // Low-skill bots: simple left/right patrol with jitter
  if (bot.position.x > rightEdge) {
    bot.inputState.right = false;
    bot.inputState.left = true;
    bot.facing = 'left';
    return;
  }
  if (bot.position.x < leftEdge) {
    bot.inputState.left = false;
    bot.inputState.right = true;
    bot.facing = 'right';
    return;
  }

  if (Math.random() < config.movementJitter * 0.05) {
    bot.inputState.left = !bot.inputState.left;
    bot.inputState.right = !bot.inputState.right;
  }

  if (!bot.inputState.left && !bot.inputState.right) {
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
 * Chase the target player using platform-aware navigation for smarter bots.
 */
export function chaseTarget(bot: Player, target: Player, match: Match, config: BotDifficultyConfig): void {
  if (config.platformNavigationSkill >= 0.3) {
    // Platform-aware navigation
    navigateToTarget(bot, target.position.x, target.position.y, match, config);
  } else {
    // Simple horizontal chase
    moveToward(bot, target.position.x);
    if (target.position.y < bot.position.y - 80 && bot.isGrounded) {
      bot.inputState.jump = true;
    }
  }

  // Aggression: aggressive bots (high aggressionLevel) jump in from the air
  const airborneChance = config.aggressionLevel * 0.15;
  if (!bot.isGrounded && bot.jumpsRemaining > 0 && Math.random() < airborneChance) {
    // Use double-jump to close the gap
    bot.inputState.jump = true;
  }
}

/**
 * Attack target: sets attack / useWeapon / throwBomb flags based on config accuracy.
 * Includes kill-confirm bonus at high damage% and spacing after attacks.
 */
export function attackTarget(bot: Player, target: Player, config: BotDifficultyConfig, now: number): void {
  const d = dist(bot.position.x, bot.position.y, target.position.x, target.position.y);
  if (d > ATTACK_RANGE) return;

  // Face the target
  bot.facing = target.position.x >= bot.position.x ? 'right' : 'left';

  // Kill confirm bonus: higher combo awareness = more aggressive at high damage%
  const killConfirmBonus = target.currentDamage > 100
    ? config.comboAwareness * 0.25
    : 0;
  const effectiveAccuracy = Math.min(1, config.attackAccuracy + killConfirmBonus);

  // Use weapon if available
  if (bot.currentWeapon) {
    if ((bot.weaponCooldownUntil ?? 0) <= now && Math.random() < effectiveAccuracy) {
      bot.inputState.useWeapon = true;
      return;
    }
    // Weapon on cooldown – fall through to melee
  }

  // Throw bomb (half the kill-confirm bonus since bombs are area-denial, not precision kills)
  if (bot.bombCooldownUntil <= now && Math.random() < config.bombUsageChance + killConfirmBonus * 0.5) {
    bot.inputState.throwBomb = true;
    return;
  }

  // Plain melee
  if ((bot.attackCooldown ?? 0) <= now && Math.random() < effectiveAccuracy) {
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
export function pickupItem(bot: Player, item: SpawnedItem, match: Match, config: BotDifficultyConfig): void {
  if (Math.random() > config.itemPickupAwareness) return;

  if (config.platformNavigationSkill >= 0.3) {
    navigateToTarget(bot, item.position.x, item.position.y, match, config);
  } else {
    moveToward(bot, item.position.x);
  }

  const d = dist(bot.position.x, bot.position.y, item.position.x, item.position.y);
  if (d < ITEM_PICKUP_RANGE) {
    bot.inputState.pickup = true;
  }
}

/**
 * Attempt to block reactively: higher-skill bots block when the enemy is
 * actually attacking; lower-skill bots are more random.
 */
export function tryBlock(bot: Player, target: Player, config: BotDifficultyConfig, now: number): void {
  const d = dist(bot.position.x, bot.position.y, target.position.x, target.position.y);
  if (d > ATTACK_RANGE * 1.5) return;
  if ((bot.blockCooldown ?? 0) > now) return;

  const targetIsAttacking = target.isAttacking === true;

  let shouldBlock: boolean;
  if (config.blockSkill >= 0.5) {
    // Skilled bots: block primarily when target is attacking; rarely otherwise
    const reactiveChance = targetIsAttacking ? config.blockSkill : config.blockSkill * 0.2;
    shouldBlock = Math.random() < reactiveChance;
  } else {
    // Low-skill bots: still somewhat reactive but noisier
    const reactiveChance = targetIsAttacking
      ? config.blockSkill * 1.5
      : config.blockSkill * 0.5;
    shouldBlock = Math.random() < Math.min(1, reactiveChance);
  }

  bot.inputState.block = shouldBlock;
}

/**
 * Edge guard: aggressively pursue and attack the target when they are near a
 * blast zone and have high damage%. Returns true if edge-guarding is active.
 */
export function edgeGuard(bot: Player, target: Player, match: Match, config: BotDifficultyConfig): boolean {
  if (config.edgeGuardSkill < 0.2) return false;

  const bz = match.map.blastZones;
  const edgeThreshold = 220;

  const targetNearEdge =
    target.position.x < bz.left + edgeThreshold ||
    target.position.x > bz.right - edgeThreshold ||
    target.position.y > bz.bottom - edgeThreshold;

  // Only worth edge-guarding when the target is vulnerable
  if (!targetNearEdge || target.currentDamage < 60) return false;

  if (Math.random() > config.edgeGuardSkill) return false;

  // Chase toward the target's position aggressively
  if (config.platformNavigationSkill >= 0.4) {
    navigateToTarget(bot, target.position.x, target.position.y, match, config);
  } else {
    moveToward(bot, target.position.x);
    if (target.position.y < bot.position.y - 50 && (bot.isGrounded || bot.jumpsRemaining > 0)) {
      bot.inputState.jump = true;
    }
  }

  return true;
}

/**
 * Approach the target from above: find a platform above the target, navigate
 * to it, and attack downward. Returns true when this behavior is active.
 */
export function approachFromAbove(
  bot: Player,
  target: Player,
  match: Match,
  config: BotDifficultyConfig,
): boolean {
  if (config.platformNavigationSkill < 0.5) return false;

  for (const p of match.map.platforms) {
    const platCenterX = p.x + p.width / 2;
    const inRange = Math.abs(platCenterX - target.position.x) < 180;
    const isAbove = p.y < target.position.y - 60;
    const reachable = canReachPlatform(bot, p);

    if (inRange && isAbove && reachable) {
      navigateToTarget(bot, platCenterX, p.y, match, config);
      return true;
    }
  }

  return false;
}

/**
 * Recovery jump: when the bot is airborne and near a blast zone, use remaining
 * jumps to reach the nearest safe platform.
 */
export function recoveryJump(bot: Player, match: Match, config: BotDifficultyConfig): void {
  const bz = match.map.blastZones;
  const centerX = (bz.left + bz.right) / 2;

  // Find the lowest reachable platform to aim for
  let targetX = centerX;
  let bestY = bz.bottom;

  for (const p of match.map.platforms) {
    if (!canReachPlatform(bot, p)) continue;
    const platCenterX = p.x + p.width / 2;
    const distToCenter = Math.abs(platCenterX - centerX);
    // Prefer lower platforms (higher y value) that are close to center.
    // bestY starts at bz.bottom (very low), so any reachable platform score will win
    // as long as score > 0, which is satisfied when the platform is above the blast zone.
    const score = p.y - distToCenter / 10;
    if (score > 0 && p.y < bestY) {
      bestY = p.y;
      targetX = platCenterX;
    }
  }

  moveToward(bot, targetX);

  if (!bot.isGrounded && bot.jumpsRemaining > 0) {
    bot.inputState.jump = true;
  }
}

export { dist, stopMovement, ATTACK_RANGE, ITEM_PICKUP_RANGE };
