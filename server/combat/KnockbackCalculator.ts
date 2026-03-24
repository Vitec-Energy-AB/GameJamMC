import { Player } from '../../shared/types';

const BASE_KNOCKBACK_MELEE = 200;
const BASE_KNOCKBACK_BOMB = 350;

export function calculateKnockback(
  attacker: Player,
  target: Player,
  baseDamage: number,
  attackModifier: number,
  attackType: 'melee' | 'bomb' = 'melee'
): { x: number; y: number } {
  const baseKnockback = attackType === 'bomb' ? BASE_KNOCKBACK_BOMB : BASE_KNOCKBACK_MELEE;

  // ShieldSplitter doubles knockback for the attacker
  const now = Date.now();
  const shieldBonus = (attacker.shieldSplitterUntil ?? 0) > now ? 2 : 1;

  const magnitude = baseKnockback * (1 + target.currentDamage / 100) * attackModifier * shieldBonus;

  // Direction: away from attacker
  let dx = target.position.x - attacker.position.x;
  let dy = target.position.y - attacker.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= dist;
  dy /= dist;

  // Bias knockback slightly upward
  dy = Math.min(dy, -0.3);
  const len = Math.sqrt(dx * dx + dy * dy);
  dx /= len;
  dy /= len;

  return {
    x: dx * magnitude,
    y: dy * magnitude,
  };
}

export function calculateBombKnockback(
  bombPosition: { x: number; y: number },
  target: Player,
  attackModifier: number
): { x: number; y: number } {
  const magnitude = BASE_KNOCKBACK_BOMB * (1 + target.currentDamage / 100) * attackModifier;

  let dx = target.position.x - bombPosition.x;
  let dy = target.position.y - bombPosition.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  dx /= dist;
  dy /= dist;

  dy = Math.min(dy, -0.4);
  const len = Math.sqrt(dx * dx + dy * dy);
  dx /= len;
  dy /= len;

  return {
    x: dx * magnitude,
    y: dy * magnitude,
  };
}

