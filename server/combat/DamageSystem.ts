import { Player } from '../../shared/types';

const BLOCK_DAMAGE_MULTIPLIER = 0.4; // Block reduces damage by 60%; target takes 40%

export function applyDamage(target: Player, damage: number, isBlocking: boolean): number {
  const now = Date.now();
  if (target.invulnerableUntil > now) return 0;

  const actualDamage = isBlocking ? damage * BLOCK_DAMAGE_MULTIPLIER : damage;
  target.currentDamage += actualDamage;
  return actualDamage;
}
