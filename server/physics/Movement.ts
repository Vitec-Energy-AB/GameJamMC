import { Player } from '../../shared/types';
import { getCharacter } from '../../shared/characters';

const DEFAULT_SPEED = 300;
const ACCELERATION = 2000;
const DECELERATION = 1500;

export function applyMovement(player: Player, dt: number): void {
  const input = player.inputState;
  const now = Date.now();

  const character = getCharacter(player.character);
  const baseSpeed = character ? character.speed : DEFAULT_SPEED;

  // Freeze effect: halved movement speed
  const freezeMultiplier = (player.freezeUntil ?? 0) > now ? 0.5 : 1.0;
  const speedBoostMultiplier = (player.speedBoostUntil ?? 0) > now ? 1.5 : 1.0;
  const speedMultiplier = freezeMultiplier * speedBoostMultiplier;
  const maxSpeed = baseSpeed * speedMultiplier;
  const accel = ACCELERATION * speedMultiplier;

  const isStaggered = (player.hitStunUntil ?? 0) > now;

  if (!isStaggered && input.left) {
    player.velocity.x = Math.max(player.velocity.x - accel * dt, -maxSpeed);
    player.facing = 'left';
  } else if (!isStaggered && input.right) {
    player.velocity.x = Math.min(player.velocity.x + accel * dt, maxSpeed);
    player.facing = 'right';
  } else {
    if (player.velocity.x > 0) {
      player.velocity.x = Math.max(0, player.velocity.x - DECELERATION * dt);
    } else if (player.velocity.x < 0) {
      player.velocity.x = Math.min(0, player.velocity.x + DECELERATION * dt);
    }
  }

  player.position.x += player.velocity.x * dt;
}

