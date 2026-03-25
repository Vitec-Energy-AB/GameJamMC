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
  dist,
  ATTACK_RANGE,
} from './BotBehaviors';

const BLAST_ZONE_MARGIN = 150; // px inside blast zone where the bot starts fleeing
const LAVA_MARGIN = 200;       // px above lava where bot starts fleeing
const THREAT_RADIUS = 250;     // px – consider a bomb/projectile a threat if this close

/** Per-bot state kept across ticks (stored as a WeakMap keyed by player object). */
interface BotState {
  lastDecisionTime: number;
  /** The last chosen behavior (for continuous execution between decisions). */
  lastBehavior: 'safety' | 'dodge' | 'item' | 'attack' | 'chase' | 'patrol';
  /** Index into name pool to avoid duplicates. */
  nameIndex?: number;
}

const botStateMap = new WeakMap<Player, BotState>();

function getState(bot: Player): BotState {
  if (!botStateMap.has(bot)) {
    botStateMap.set(bot, { lastDecisionTime: 0, lastBehavior: 'patrol' });
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
  if (bot.status !== 'alive') return;

  const difficulty = bot.botDifficulty ?? 3;
  const config = getBotConfig(difficulty);
  const state = getState(bot);

  // Rate-limit: continue executing last behavior until reaction time elapses
  const isNewDecision = (now - state.lastDecisionTime) >= config.reactionTimeMs;

  // Always reset input so old flags don't linger across ticks
  resetInput(bot);

  // ── 1. SAFETY: Near blast zones or lava? ─────────────────────────────────
  const bz = match.map.blastZones;
  const nearEdge =
    bot.position.x < bz.left + BLAST_ZONE_MARGIN ||
    bot.position.x > bz.right - BLAST_ZONE_MARGIN ||
    bot.position.y > bz.bottom - BLAST_ZONE_MARGIN ||
    bot.position.y < bz.top + BLAST_ZONE_MARGIN;

  const lavaActive = match.lavaState?.active ?? false;
  const lavaY = match.lavaState?.currentY ?? Infinity;
  const nearLava = lavaActive && bot.position.y > lavaY - LAVA_MARGIN;

  if (nearEdge || nearLava) {
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

  // ── 2. DANGER: Incoming bomb or projectile? ───────────────────────────────
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

  // ── 3. ITEM: Nearby weapon / powerup? ────────────────────────────────────
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

  // ── 4. ATTACK: Enemy in range? ────────────────────────────────────────────
  if (target && targetDist <= ATTACK_RANGE * 1.1) {
    if (isNewDecision) {
      state.lastBehavior = 'attack';
      state.lastDecisionTime = now;
    }
    tryBlock(bot, target, config, now);
    attackTarget(bot, target, config, now);
    // Also move toward the target so we don't just stand still
    chaseTarget(bot, target, match, config);
    return;
  }

  // ── 5. CHASE: Enemy visible? ─────────────────────────────────────────────
  if (target) {
    if (isNewDecision) {
      state.lastBehavior = 'chase';
      state.lastDecisionTime = now;
    }
    if (state.lastBehavior === 'chase' || state.lastBehavior === 'attack') {
      chaseTarget(bot, target, match, config);
      return;
    }
  }

  // ── 6. PATROL ─────────────────────────────────────────────────────────────
  if (isNewDecision) {
    state.lastBehavior = 'patrol';
    state.lastDecisionTime = now;
  }
  patrol(bot, match, config);
}
