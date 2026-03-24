import { Player, Platform } from '../../shared/types';
import { setGrounded } from './Gravity';

const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;

export function checkPlatformCollisions(player: Player, platforms: Platform[], dt: number = 1 / 60): void {
  let grounded = false;

  for (const platform of platforms) {
    const pLeft = player.position.x;
    const pRight = player.position.x + PLAYER_WIDTH;
    const pTop = player.position.y;
    const pBottom = player.position.y + PLAYER_HEIGHT;

    const platLeft = platform.x;
    const platRight = platform.x + platform.width;
    const platTop = platform.y;
    const platBottom = platform.y + platform.height;

    // Check horizontal overlap
    const horizontalOverlap = pLeft < platRight && pRight > platLeft;
    if (!horizontalOverlap) continue;

    if (platform.type === 'solid') {
      // Full collision
      const verticalOverlap = pTop < platBottom && pBottom > platTop;
      if (!verticalOverlap) continue;

      const overlapLeft = platRight - pLeft;
      const overlapRight = pRight - platLeft;
      const overlapTop = platBottom - pTop;
      const overlapBottom = pBottom - platTop;

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapBottom && player.velocity.y > 0) {
        player.position.y = platTop - PLAYER_HEIGHT;
        grounded = true;
      } else if (minOverlap === overlapTop && player.velocity.y < 0) {
        player.position.y = platBottom;
        player.velocity.y = 0;
      } else if (minOverlap === overlapLeft) {
        player.position.x = platRight;
        player.velocity.x = 0;
      } else if (minOverlap === overlapRight) {
        player.position.x = platLeft - PLAYER_WIDTH;
        player.velocity.x = 0;
      }
    } else {
      // Passthrough: only collide from above
      const prevBottom = player.position.y + PLAYER_HEIGHT - player.velocity.y * dt;
      if (prevBottom <= platTop && pBottom >= platTop && player.velocity.y >= 0) {
        player.position.y = platTop - PLAYER_HEIGHT;
        grounded = true;
      }
    }
  }

  setGrounded(player, grounded);
}
