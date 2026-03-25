import { Player } from '../../shared/types';
import { getCharacter } from '../../shared/characters';
import { LAVA_JUMP_MULTIPLIER } from './LavaSystem';

const GRAVITY = 980;
const MAX_FALL_SPEED = 1200;
const DEFAULT_JUMP_VELOCITY = -600;
const DEFAULT_MAX_JUMPS = 2;

export function applyGravity(player: Player, dt: number): void {
  if (!player.inLava && !player.isGrounded) {
    player.velocity.y = Math.min(player.velocity.y + GRAVITY * dt, MAX_FALL_SPEED);
  }
  player.position.y += player.velocity.y * dt;
}

export function applyJump(player: Player): void {
  if (player.jumpsRemaining > 0) {
    const character = getCharacter(player.character);
    const jumpVelocity = character ? character.jumpForce : DEFAULT_JUMP_VELOCITY;
    player.velocity.y = player.inLava ? jumpVelocity * LAVA_JUMP_MULTIPLIER : jumpVelocity;
    player.jumpsRemaining--;
    player.isGrounded = false;
  }
}

export function setGrounded(player: Player, grounded: boolean): void {
  player.isGrounded = grounded;
  if (grounded) {
    const character = getCharacter(player.character);
    const maxJumps = character ? character.maxJumps : DEFAULT_MAX_JUMPS;
    player.jumpsRemaining = maxJumps;
    if (player.velocity.y > 0) {
      player.velocity.y = 0;
    }
  }
}
