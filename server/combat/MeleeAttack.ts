import { Player, HitResult } from '../../shared/types';
import { applyDamage } from './DamageSystem';
import { calculateKnockback } from './KnockbackCalculator';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../../shared/constants';
import { getCharacter } from '../../shared/characters';

const ATTACK_COOLDOWN = 500; // ms
const BASE_DAMAGE = 20;
const ATTACK_MODIFIER = 1.0;
const HITBOX_WIDTH = 100;
const HITBOX_HEIGHT = 140;

export interface WeaponOverride {
  damage: number;
  knockbackModifier: number;
}

export function performAttack(attacker: Player, targets: Player[], weaponOverride?: WeaponOverride): HitResult[] {
  const now = Date.now();
  if ((attacker.attackCooldown ?? 0) > now) return [];

  attacker.attackCooldown = now + ATTACK_COOLDOWN;

  const character = getCharacter(attacker.character);
  const dmgMod = character ? character.dmgMod : 1.0;

  const damage = (weaponOverride?.damage ?? BASE_DAMAGE) * dmgMod;
  const attackModifier = weaponOverride?.knockbackModifier ?? ATTACK_MODIFIER;

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
      const appliedDamage = applyDamage(target, damage, blocked);
      const knockback = calculateKnockback(attacker, target, damage, attackModifier, 'melee');

      if (!blocked) {
        target.velocity.x += knockback.x;
        target.velocity.y += knockback.y;
        target.invulnerableUntil = now + 1000;
        const knockbackMagnitude = Math.sqrt(knockback.x * knockback.x + knockback.y * knockback.y);
        target.hitStunUntil = now + 200 + Math.min(knockbackMagnitude * 0.5, 400);
      } else {
        // Reduced knockback when blocking
        target.velocity.x += knockback.x * 0.2;
        target.velocity.y += knockback.y * 0.2;
      }

      results.push({ targetId: target.id, damage: appliedDamage, knockback, blocked });
    }
  }

  return results;
}
