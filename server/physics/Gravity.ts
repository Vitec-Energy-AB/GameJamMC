import { Player } from '../../shared/types';

const GRAVITY = 980;
const MAX_FALL_SPEED = 1200;
const JUMP_VELOCITY = -600;
const MAX_JUMPS = 2;

export function applyGravity(player: Player, dt: number): void {
  if (!player.isGrounded) {
    player.velocity.y = Math.min(player.velocity.y + GRAVITY * dt, MAX_FALL_SPEED);
  }
  player.position.y += player.velocity.y * dt;
}

export function applyJump(player: Player): void {
  if (player.jumpsRemaining > 0) {
    player.velocity.y = JUMP_VELOCITY;
    player.jumpsRemaining--;
    player.isGrounded = false;
  }
}

export function setGrounded(player: Player, grounded: boolean): void {
  player.isGrounded = grounded;
  if (grounded) {
    player.jumpsRemaining = MAX_JUMPS;
    if (player.velocity.y > 0) {
      player.velocity.y = 0;
    }
  }
}
