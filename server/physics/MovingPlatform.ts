import { Match, MovingPlatformState, Player } from '../../shared/types';
import { PLAYER_WIDTH as PLAYER_W, PLAYER_HEIGHT as PLAYER_H } from '../../shared/constants';

export function updateMovingPlatforms(match: Match, dt: number): void {
  for (const mp of match.movingPlatforms) {
    const prevX = mp.currentX;
    mp.currentX += mp.def.speed * mp.direction * dt;

    if (mp.currentX >= mp.def.maxX) {
      mp.currentX = mp.def.maxX;
      mp.direction = -1;
    } else if (mp.currentX <= mp.def.minX) {
      mp.currentX = mp.def.minX;
      mp.direction = 1;
    }

    const dx = mp.currentX - prevX;
    mp.def.platform.x = mp.currentX;

    // Move players standing on the platform
    for (const player of match.players) {
      if (player.status !== 'alive') continue;
      if (!isPlayerOnPlatform(player, mp)) continue;
      player.position.x += dx;
    }
  }
}

function isPlayerOnPlatform(player: Player, mp: MovingPlatformState): boolean {
  const plat = mp.def.platform;

  const playerBottom = player.position.y + PLAYER_H;
  const playerLeft = player.position.x;
  const playerRight = player.position.x + PLAYER_W;

  const onTopSurface = Math.abs(playerBottom - plat.y) <= 4;
  const horizontallyOverlapping = playerRight > plat.x && playerLeft < plat.x + plat.width;
  return onTopSurface && horizontallyOverlapping && player.isGrounded;
}

export function buildMovingPlatformStates(match: Match): void {
  match.movingPlatforms = [];
  const defs = match.map.movingPlatforms ?? [];
  for (let i = 0; i < defs.length; i++) {
    const def = defs[i];
    match.movingPlatforms.push({
      id: `mp_${i}`,
      def: { ...def, platform: { ...def.platform } },
      currentX: def.platform.x,
      direction: 1,
    });
  }
}
