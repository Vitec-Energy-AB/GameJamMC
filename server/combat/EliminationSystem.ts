import { Player, Match } from '../../shared/types';
import { Server } from 'socket.io';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../../shared/constants';

const RESPAWN_DELAY = 3000; // ms
const INVULNERABLE_DURATION = 1000; // ms
const STOCK_LIVES = 3;
const KNOCKOUT_LIVES = 1;

export function checkBlastZones(player: Player, blastZones: Match['map']['blastZones']): boolean {
  return (
    (player.position.y + PLAYER_HEIGHT > blastZones.bottom) ||
    (player.position.x + PLAYER_WIDTH > blastZones.right) ||
    (player.position.x < blastZones.left)
  );
}

export function eliminatePlayer(player: Player, match: Match, io: Server): void {
  player.currentLives--;
  io.to(match.roomId).emit('player:eliminated', { playerId: player.id, livesRemaining: player.currentLives });

  if (player.currentLives <= 0) {
    player.status = 'eliminated';
  } else {
    player.status = 'respawning';
    player.respawnTimer = Date.now() + RESPAWN_DELAY;
  }
}

export function respawnPlayer(player: Player, spawnPoints: { x: number; y: number }[], lavaY?: number): void {
  let candidates = spawnPoints;
  if (lavaY !== undefined) {
    const safePoints = spawnPoints.filter(sp => sp.y + PLAYER_HEIGHT < lavaY);
    if (safePoints.length > 0) {
      candidates = safePoints;
    } else {
      // All spawn points are submerged – pick the highest one (lowest y value)
      candidates = [spawnPoints.reduce((best, sp) => sp.y < best.y ? sp : best, spawnPoints[0])];
    }
  }
  const spawn = candidates[Math.floor(Math.random() * candidates.length)];
  player.position = { x: spawn.x, y: spawn.y };
  player.velocity = { x: 0, y: 0 };
  player.status = 'alive';
  player.isGrounded = false;
  player.jumpsRemaining = 2;
  player.invulnerableUntil = Date.now() + INVULNERABLE_DURATION;
  player.currentDamage = 0;
  player.currentWeapon = null;
  player.freezeUntil = 0;
  player.shieldSplitterUntil = 0;
  player.damageMitigation = 0;
  player.forceFieldUntil = 0;
}

export function initPlayerLives(player: Player, mode: 'stock' | 'knockout'): void {
  player.currentLives = mode === 'stock' ? STOCK_LIVES : KNOCKOUT_LIVES;
}
