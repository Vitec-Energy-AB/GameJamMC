import { Player, Match } from '../../shared/types';
import { Server } from 'socket.io';
import { PLAYER_WIDTH, PLAYER_HEIGHT } from '../../shared/constants';

const RESPAWN_DELAY = 3000; // ms
const INVULNERABLE_DURATION = 1000; // ms
const STOCK_LIVES = 3;
const KNOCKOUT_LIVES = 1;

export function checkBlastZones(player: Player, blastZones: Match['map']['blastZones']): boolean {
  return (
    player.position.y < blastZones.top ||
    player.position.y + PLAYER_HEIGHT > blastZones.bottom ||
    player.position.x < blastZones.left ||
    player.position.x + PLAYER_WIDTH > blastZones.right
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

export function respawnPlayer(player: Player, spawnPoints: { x: number; y: number }[]): void {
  const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
  player.position = { x: spawn.x, y: spawn.y };
  player.velocity = { x: 0, y: 0 };
  player.status = 'alive';
  player.isGrounded = false;
  player.jumpsRemaining = 2;
  player.invulnerableUntil = Date.now() + INVULNERABLE_DURATION;
}

export function initPlayerLives(player: Player, mode: 'stock' | 'knockout'): void {
  player.currentLives = mode === 'stock' ? STOCK_LIVES : KNOCKOUT_LIVES;
}
