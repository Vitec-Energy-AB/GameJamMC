import { Player, HitResult } from '../../shared/types';
import { applyDamage } from './DamageSystem';
import { calculateKnockback } from './KnockbackCalculator';

const ATTACK_COOLDOWN = 500; // ms
const BASE_DAMAGE = 15;
const ATTACK_MODIFIER = 1.0;
const HITBOX_WIDTH = 60;
const HITBOX_HEIGHT = 80;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;

export function performAttack(attacker: Player, targets: Player[]): HitResult[] {
  const now = Date.now();
  if ((attacker.attackCooldown ?? 0) > now) return [];

  attacker.attackCooldown = now + ATTACK_COOLDOWN;

  // Compute hitbox position based on facing
  const hitboxX = attacker.facing === 'right'
    ? attacker.position.x + PLAYER_WIDTH
    : attacker.position.x - HITBOX_WIDTH;
  const hitboxY = attacker.position.y;

  const results: HitResult[] = [];

  for (const target of targets) {
    if (target.id === attacker.id) continue;
    if (target.status !== 'alive') continue;
    if (target.invulnerableUntil > now) continue;

    // AABB check
    if (
      hitboxX < target.position.x + PLAYER_WIDTH &&
      hitboxX + HITBOX_WIDTH > target.position.x &&
      hitboxY < target.position.y + PLAYER_HEIGHT &&
      hitboxY + HITBOX_HEIGHT > target.position.y
    ) {
      const blocked = target.isBlocking;
      const damage = applyDamage(target, BASE_DAMAGE, blocked);
      const knockback = calculateKnockback(attacker, target, BASE_DAMAGE, ATTACK_MODIFIER, 'melee');

      if (!blocked) {
        target.velocity.x += knockback.x;
        target.velocity.y += knockback.y;
        target.invulnerableUntil = now + 1000;
      } else {
        // Reduced knockback when blocking
        target.velocity.x += knockback.x * 0.2;
        target.velocity.y += knockback.y * 0.2;
      }

      results.push({ targetId: target.id, damage, knockback, blocked });
    }
  }

  return results;
}
