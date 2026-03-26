import { v4 as uuidv4 } from 'uuid';
import { Player, Bomb, HitResult } from '../../shared/types';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../../shared/constants';
import { applyDamage } from './DamageSystem';
import { calculateBombKnockback } from './KnockbackCalculator';

const FUSE_TIMER = 3.0; // seconds
const EXPLOSION_RADIUS = 120;
const DAMAGE = 25;
const KNOCKBACK_MULTIPLIER = 1.5;
const THROW_SPEED = 500;
const THROW_ANGLE = -0.5; // radians upward

export function createBomb(thrower: Player, direction: 'left' | 'right'): Bomb {
  const dirMult = direction === 'right' ? 1 : -1;
  return {
    id: uuidv4(),
    position: {
      x: thrower.position.x + (direction === 'right' ? PLAYER_WIDTH + 5 : -20),
      y: thrower.position.y,
    },
    velocity: {
      x: dirMult * THROW_SPEED * Math.cos(Math.abs(THROW_ANGLE)),
      y: THROW_SPEED * Math.sin(THROW_ANGLE),
    },
    thrownBy: thrower.id,
    fuseTimer: FUSE_TIMER,
    explosionRadius: EXPLOSION_RADIUS,
    damage: DAMAGE,
    knockbackMultiplier: KNOCKBACK_MULTIPLIER,
  };
}

export function explodeBomb(bomb: Bomb, players: Player[]): HitResult[] {
  const results: HitResult[] = [];
  const now = Date.now();

  for (const player of players) {
    if (player.status !== 'alive') continue;
    if (player.invulnerableUntil > now) continue;

    const cx = player.position.x + PLAYER_WIDTH / 2;
    const cy = player.position.y + PLAYER_HEIGHT / 2;
    const dx = cx - bomb.position.x;
    const dy = cy - bomb.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= bomb.explosionRadius) {
      const falloff = 1 - dist / bomb.explosionRadius;
      const damage = applyDamage(player, bomb.damage * falloff, player.isBlocking);
      const knockback = calculateBombKnockback(bomb.position, player, KNOCKBACK_MULTIPLIER * falloff);

      player.velocity.x += knockback.x;
      player.velocity.y += knockback.y;
      player.invulnerableUntil = now + 1000;

      if (!player.isBlocking) {
        const knockbackMagnitude = Math.sqrt(knockback.x * knockback.x + knockback.y * knockback.y);
        player.hitStunUntil = now + 200 + Math.min(knockbackMagnitude * 0.5, 400);
      }

      results.push({ targetId: player.id, damage, knockback, blocked: player.isBlocking });
    }
  }

  return results;
}
