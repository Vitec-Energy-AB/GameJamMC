import { Player, Match, SpawnedItem } from '../../shared/types';
import { getBotConfig } from './BotConfig';
import {
  patrol,
  chaseTarget,
  attackTarget,
  dodgeThreat,
  recoverToSafety,
  pickupItem,
  tryBlock,
  edgeGuard,
  recoveryJump,
  dist,
  ATTACK_RANGE,
} from './BotBehaviors';

const BLAST_ZONE_MARGIN = 150; // px inside blast zone where the bot starts fleeing
const LAVA_MARGIN = 200;       // px above lava where bot starts fleeing
const THREAT_RADIUS = 250;     // px – consider a bomb/projectile a threat if this close
const RECOVERY_MARGIN = 180;   // px from blast zone edge where airborne bot triggers recovery

/** Per-bot state kept across ticks (stored as a WeakMap keyed by player object). */
interface BotState {
  lastDecisionTime: number;
  /** The last chosen behavior (for continuous execution between decisions). */
  lastBehavior: 'safety' | 'dodge' | 'item' | 'attack' | 'chase' | 'patrol' | 'edgeguard' | 'recovery';
  /** Timestamp of the last successful attack (for combo/spacing timing). */
  lastAttackTime: number;
  /** Index of the target platform during navigation (-1 = none). */
  targetPlatformIndex: number;
  /** Index into name pool to avoid duplicates. */
  nameIndex?: number;
}

const botStateMap = new WeakMap<Player, BotState>();

function getState(bot: Player): BotState {
  if (!botStateMap.has(bot)) {
    botStateMap.set(bot, {
      lastDecisionTime: 0,
      lastBehavior: 'patrol',
      lastAttackTime: 0,
      targetPlatformIndex: -1,
    });
  }
  return botStateMap.get(bot)!;
}

/** Clear bot state (e.g. on remove). */
export function clearBotState(bot: Player): void {
  botStateMap.delete(bot);
}

/** Reset input state to all-false before deciding what to do this tick. */
function resetInput(bot: Player): void {
  bot.inputState = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    block: false,
    throwBomb: false,
    pickup: false,
    useWeapon: false,
    duck: false,
  };
}

/**
 * Run the full AI decision cycle for one bot.
 * Called every game tick. Decisions are rate-limited by `reactionTimeMs`.
 */
export function evaluate(bot: Player, match: Match, now: number): void {
  if (bot.status !== 'alive') {
    // Auto-activate bots that are stuck in 'ready' state when the match is already running
    if (bot.status === 'ready' && match.state === 'active') {
      bot.status = 'alive';
    } else {
      return;
    }
  }

  const difficulty = bot.botDifficulty ?? 3;
  const config = getBotConfig(difficulty);
  const state = getState(bot);

  // Rate-limit: continue executing last behavior until reaction time elapses
  const isNewDecision = (now - state.lastDecisionTime) >= config.reactionTimeMs;

  // Always reset input so old flags don't linger across ticks
  resetInput(bot);

  const bz = match.map.blastZones;

  // ── 1. RECOVERY: Airborne bot near a blast-zone edge uses remaining jumps ──
  const nearBlastEdge =
    bot.position.x < bz.left + RECOVERY_MARGIN ||
    bot.position.x > bz.right - RECOVERY_MARGIN ||
    bot.position.y > bz.bottom - RECOVERY_MARGIN;

  if (!bot.isGrounded && nearBlastEdge && bot.jumpsRemaining > 0 && config.edgeAvoidance >= 0.5) {
    if (isNewDecision) {
      state.lastBehavior = 'recovery';
      state.lastDecisionTime = now;
    }
    recoveryJump(bot, match, config);
    return;
  }

  // ── 2. SAFETY: Near blast zones or lava? ─────────────────────────────────
  const safetyNearEdge =
    bot.position.x < bz.left + BLAST_ZONE_MARGIN ||
    bot.position.x > bz.right - BLAST_ZONE_MARGIN ||
    bot.position.y > bz.bottom - BLAST_ZONE_MARGIN ||
    bot.position.y < bz.top + BLAST_ZONE_MARGIN;

  const lavaActive = match.lavaState?.active ?? false;
  const lavaY = match.lavaState?.currentY ?? Infinity;
  const nearLava = lavaActive && bot.position.y > lavaY - LAVA_MARGIN;

  if (safetyNearEdge || nearLava) {
    // Safety is critical – always flee regardless of probability gate
    const centerX = (bz.left + bz.right) / 2;
    if (bot.position.x < centerX) {
      bot.inputState.right = true;
      bot.inputState.left = false;
    } else {
      bot.inputState.left = true;
      bot.inputState.right = false;
    }
    if (isNewDecision) {
      state.lastBehavior = 'safety';
      state.lastDecisionTime = now;
    }
    return;
  }

  // ── 3. DANGER: Incoming bomb or projectile? ───────────────────────────────
  let closestThreatX: number | null = null;
  let closestThreatDist = Infinity;

  for (const bomb of match.bombs) {
    const d = dist(bot.position.x, bot.position.y, bomb.position.x, bomb.position.y);
    if (d < THREAT_RADIUS && d < closestThreatDist) {
      closestThreatDist = d;
      closestThreatX = bomb.position.x;
    }
  }
  for (const proj of match.projectiles) {
    const d = dist(bot.position.x, bot.position.y, proj.position.x, proj.position.y);
    if (d < THREAT_RADIUS && d < closestThreatDist) {
      closestThreatDist = d;
      closestThreatX = proj.position.x;
    }
  }

  if (closestThreatX !== null) {
    if (isNewDecision) {
      state.lastBehavior = 'dodge';
      state.lastDecisionTime = now;
    }
    if (state.lastBehavior === 'dodge') {
      dodgeThreat(bot, closestThreatX, config);
      return;
    }
  }

  // ── 4. ITEM: Nearby weapon / powerup? ────────────────────────────────────
  let closestItem: SpawnedItem | null = null;
  let closestItemDist = Infinity;

  for (const item of match.items) {
    if (!item.active) continue;
    const d = dist(bot.position.x, bot.position.y, item.position.x, item.position.y);
    if (d < closestItemDist) {
      closestItemDist = d;
      closestItem = item;
    }
  }

  if (closestItem && closestItemDist < 400 && !bot.currentWeapon) {
    if (isNewDecision) {
      state.lastBehavior = 'item';
      state.lastDecisionTime = now;
    }
    if (state.lastBehavior === 'item') {
      pickupItem(bot, closestItem, match, config);
      return;
    }
  }

  // ── Find nearest alive enemy ──────────────────────────────────────────────
  let target: Player | null = null;
  let targetDist = Infinity;

  for (const p of match.players) {
    if (p.id === bot.id) continue;
    if (p.status !== 'alive') continue;
    const d = dist(bot.position.x, bot.position.y, p.position.x, p.position.y);
    if (d < targetDist) {
      targetDist = d;
      target = p;
    }
  }

  // ── 5. EDGE GUARD: Target near blast zone with high damage? ───────────────
  if (target && isNewDecision && config.edgeGuardSkill >= 0.2) {
    const guarding = edgeGuard(bot, target, match, config);
    if (guarding) {
      state.lastBehavior = 'edgeguard';
      state.lastDecisionTime = now;
      // Also attack if within range during edge guard
      if (targetDist <= ATTACK_RANGE * 1.1) {
        attackTarget(bot, target, config, now);
      }
      return;
    }
  }
  // Continue edge guard between decisions
  if (target && state.lastBehavior === 'edgeguard' && !isNewDecision) {
    const guarding = edgeGuard(bot, target, match, config);
    if (guarding) {
      if (targetDist <= ATTACK_RANGE * 1.1) {
        attackTarget(bot, target, config, now);
      }
      return;
    }
    // Target moved away from edge – fall through to normal attack/chase
  }

  // ── 6. ATTACK: Enemy in range? ────────────────────────────────────────────
  if (target && targetDist <= ATTACK_RANGE * 1.1) {
    if (isNewDecision) {
      state.lastBehavior = 'attack';
      state.lastDecisionTime = now;
      state.lastAttackTime = now;
    }

    // Reactive blocking: skilled bots block when the target is actually attacking
    const targetIsAttacking = target.isAttacking === true;
    const blockChance = targetIsAttacking
      ? config.blockSkill
      : config.blockSkill * 0.25;

    if (Math.random() < blockChance) {
      tryBlock(bot, target, config, now);
    } else {
      attackTarget(bot, target, config, now);
    }
    // Also move toward the target so we don't just stand still
    chaseTarget(bot, target, match, config);
    return;
  }

  // ── 7. CHASE: Enemy visible? ─────────────────────────────────────────────
  if (target) {
    if (isNewDecision) {
      state.lastBehavior = 'chase';
      state.lastDecisionTime = now;
    }
    // Always chase when there's a target, regardless of last behavior
    chaseTarget(bot, target, match, config);
    return;
  }

  // ── 8. PATROL ─────────────────────────────────────────────────────────────
  if (isNewDecision) {
    state.lastBehavior = 'patrol';
    state.lastDecisionTime = now;
  }
  patrol(bot, match, config);
}
