import { Match, Player } from '../../shared/types';
import { Server } from 'socket.io';
import { PLAYER_HEIGHT } from '../../shared/constants';

export const DEFAULT_LAVA_RISE_SPEED = 25;
export const DEFAULT_LAVA_DAMAGE = 50;
export const DEFAULT_START_DELAY = 8;
export const DEFAULT_ACCELERATION = 1.5;
const LAVA_DAMAGE_INTERVAL = 500;

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
      const key = `${match.roomId}:${player.id}`;
      const lastDmg = lastLavaDamage.get(key) ?? 0;
      if (now - lastDmg >= LAVA_DAMAGE_INTERVAL) {
        player.currentDamage += lava.baseDamage;
        lastLavaDamage.set(key, now);

        player.velocity.y = -400;

        io.to(match.roomId).emit('player:lava', {
          playerId: player.id,
          damage: lava.baseDamage,
          lavaY: lava.currentY,
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
