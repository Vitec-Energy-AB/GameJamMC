import { Player } from '../../shared/types';

const SPEED = 300;
const ACCELERATION = 2000;
const DECELERATION = 1500;

export function applyMovement(player: Player, dt: number): void {
  const input = player.inputState;

  if (input.left) {
    player.velocity.x = Math.max(player.velocity.x - ACCELERATION * dt, -SPEED);
    player.facing = 'left';
  } else if (input.right) {
    player.velocity.x = Math.min(player.velocity.x + ACCELERATION * dt, SPEED);
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
