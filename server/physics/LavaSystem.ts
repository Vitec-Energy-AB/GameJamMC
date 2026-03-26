import { Match, Player } from '../../shared/types';
import { Server } from 'socket.io';
import { PLAYER_HEIGHT, PLAYER_WIDTH } from '../../shared/constants';

export const DEFAULT_LAVA_RISE_SPEED = 15;
export const DEFAULT_LAVA_DAMAGE = 50;
export const DEFAULT_START_DELAY = 8;
export const DEFAULT_ACCELERATION = 0.8;
const LAVA_DAMAGE_INTERVAL = 500;
const LAVA_MAX_SINK_SPEED = 35;   // max downward velocity in lava (px/s) — very slow like quicksand
const LAVA_DRAG = 0.88;           // per-frame velocity multiplier (exponential decay) for all axes
export const LAVA_JUMP_MULTIPLIER = 0.55;  // jump in lava = 55% of normal

// Keyed by `${roomId}:${playerId}` to support multiple simultaneous matches
const lastLavaDamage: Map<string, number> = new Map();

export function initLavaState(match: Match): void {
  match.lavaState = {
    active: true,
    currentY: match.map.blastZones.bottom,
    riseSpeed: DEFAULT_LAVA_RISE_SPEED,
    baseDamage: DEFAULT_LAVA_DAMAGE,
    startDelay: DEFAULT_START_DELAY,
    startedAt: Date.now(),
    accelerationRate: DEFAULT_ACCELERATION,
  };
}

export function updateLava(match: Match, dt: number, io: Server): void {
  const lava = match.lavaState;
  if (!lava || !lava.active) return;

  const now = Date.now();
  const elapsed = (now - lava.startedAt) / 1000;

  if (elapsed < lava.startDelay) return;

  const timeRising = elapsed - lava.startDelay;
  const currentSpeed = lava.riseSpeed + (lava.accelerationRate * timeRising);

  lava.currentY -= currentSpeed * dt;

  for (const player of match.players) {
    if (player.status !== 'alive') continue;

    const playerBottom = player.position.y + PLAYER_HEIGHT;

    if (playerBottom >= lava.currentY) {
      // Set inLava flag (read by Gravity.ts to disable normal gravity)
      player.inLava = true;

      // Heavy drag on both axes — like moving through molasses
      player.velocity.x *= LAVA_DRAG;
      player.velocity.y *= LAVA_DRAG;

      // Gentle downward pull capped at LAVA_MAX_SINK_SPEED (quicksand-style)
      player.velocity.y = Math.min(player.velocity.y + 20 * dt, LAVA_MAX_SINK_SPEED);

      // Give back 1 jump so the player can attempt to escape
      if (player.jumpsRemaining === 0) player.jumpsRemaining = 1;

      const key = `${match.roomId}:${player.id}`;
      const lastDmg = lastLavaDamage.get(key) ?? 0;
      if (now - lastDmg >= LAVA_DAMAGE_INTERVAL) {
        player.currentDamage += lava.baseDamage;
        lastLavaDamage.set(key, now);

        io.to(match.roomId).emit('player:lava', {
          playerId: player.id,
          damage: lava.baseDamage,
          lavaY: lava.currentY,
          x: player.position.x + PLAYER_WIDTH / 2,
        });
      }
    }
  }
}

export function resetLavaDamageTracking(roomId: string): void {
  for (const key of lastLavaDamage.keys()) {
    if (key.startsWith(`${roomId}:`)) {
      lastLavaDamage.delete(key);
    }
  }
}
