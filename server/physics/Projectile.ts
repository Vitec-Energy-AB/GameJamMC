import { Bomb, Platform } from '../../shared/types';

const GRAVITY = 980;
const MAX_FALL_SPEED = 1200;

export function updateBomb(bomb: Bomb, dt: number): void {
  bomb.velocity.y = Math.min(bomb.velocity.y + GRAVITY * dt, MAX_FALL_SPEED);
  bomb.position.x += bomb.velocity.x * dt;
  bomb.position.y += bomb.velocity.y * dt;
  bomb.fuseTimer -= dt;
}

export function checkBombCollisions(bomb: Bomb, platforms: Platform[]): boolean {
  const bombSize = 16;
  for (const platform of platforms) {
    if (
      bomb.position.x + bombSize > platform.x &&
      bomb.position.x < platform.x + platform.width &&
      bomb.position.y + bombSize > platform.y &&
      bomb.position.y < platform.y + platform.height
    ) {
      if (platform.type === 'solid') {
        bomb.velocity.x *= 0.5;
        bomb.velocity.y = -Math.abs(bomb.velocity.y) * 0.4;
        bomb.position.y = platform.y - bombSize;
        return false;
      } else {
        // Passthrough - only stop from above
        if (bomb.velocity.y > 0 && bomb.position.y + bombSize - bomb.velocity.y * (1/60) <= platform.y) {
          bomb.velocity.x *= 0.5;
          bomb.velocity.y = -Math.abs(bomb.velocity.y) * 0.4;
          bomb.position.y = platform.y - bombSize;
          return false;
        }
      }
    }
  }
  return false;
}
