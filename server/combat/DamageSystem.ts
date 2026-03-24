import { Player } from '../../shared/types';

const BLOCK_REDUCTION = 0.4; // 60% reduction means target takes 40%

export function applyDamage(target: Player, damage: number, isBlocking: boolean): number {
  const now = Date.now();
  if (target.invulnerableUntil > now) return 0;

  const actualDamage = isBlocking ? damage * BLOCK_REDUCTION : damage;
  target.currentDamage += actualDamage;
  return actualDamage;
}
