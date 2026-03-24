import { Match, CrumblingPlatformState, Player } from '../../shared/types';
import { Server } from 'socket.io';

const CRUMBLE_TRIGGER_MS = 0;   // starts crumbling immediately when stood on
const CRUMBLE_FALL_MS   = 5000; // falls away after 5 s of crumbling
const RESPAWN_MS        = 8000; // respawns 8 s after falling

export function buildCrumblingPlatformStates(match: Match): void {
  match.crumblingPlatforms = [];
  const defs = match.map.crumblingPlatforms ?? [];
  for (let i = 0; i < defs.length; i++) {
    match.crumblingPlatforms.push({
      id: `cp_${i}`,
      def: { platform: { ...defs[i].platform } },
      state: 'solid',
      crumbleStart: 0,
      respawnAt: 0,
    });
  }
}

export function updateCrumblingPlatforms(match: Match, io: Server): void {
  const now = Date.now();

  for (const cp of match.crumblingPlatforms) {
    switch (cp.state) {
      case 'solid': {
        // Check whether any player is standing on it
        const occupied = match.players.some(p => isPlayerOnCrumbling(p, cp));
        if (occupied) {
          cp.state = 'crumbling';
          cp.crumbleStart = now;
          io.to(match.roomId).emit('platform:crumble', { id: cp.id });
        }
        break;
      }
      case 'crumbling': {
        if (now - cp.crumbleStart >= CRUMBLE_FALL_MS) {
          cp.state = 'gone';
          cp.respawnAt = now + RESPAWN_MS;
          io.to(match.roomId).emit('platform:gone', { id: cp.id });
        }
        break;
      }
      case 'gone': {
        if (now >= cp.respawnAt) {
          cp.state = 'solid';
          cp.crumbleStart = 0;
          cp.respawnAt = 0;
          io.to(match.roomId).emit('platform:respawn', { id: cp.id });
        }
        break;
      }
    }
  }
}

function isPlayerOnCrumbling(player: Player, cp: CrumblingPlatformState): boolean {
  if (player.status !== 'alive') return false;
  const PLAYER_W = 40;
  const PLAYER_H = 60;
  const plat = cp.def.platform;

  const playerBottom = player.position.y + PLAYER_H;
  const playerLeft   = player.position.x;
  const playerRight  = player.position.x + PLAYER_W;

  return (
    Math.abs(playerBottom - plat.y) <= 4 &&
    playerRight > plat.x &&
    playerLeft  < plat.x + plat.width &&
    player.isGrounded
  );
}

/** Returns the platform for collision purposes, or null if gone. */
export function getCrumblingPlatformForCollision(cp: CrumblingPlatformState) {
  return cp.state !== 'gone' ? cp.def.platform : null;
}
