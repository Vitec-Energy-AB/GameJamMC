import { Player } from '../../shared/types';

const SPEED = 300;
const ACCELERATION = 2000;
const DECELERATION = 1500;

export function applyMovement(player: Player, dt: number): void {
  const input = player.inputState;
  const now = Date.now();

  // Freeze effect: halved movement speed
  const speedMultiplier = (player.freezeUntil ?? 0) > now ? 0.5 : 1.0;
  const maxSpeed = SPEED * speedMultiplier;
  const accel = ACCELERATION * speedMultiplier;

  if (input.left) {
    player.velocity.x = Math.max(player.velocity.x - accel * dt, -maxSpeed);
    player.facing = 'left';
  } else if (input.right) {
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

