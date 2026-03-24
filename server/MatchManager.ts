import { Match, Player } from '../shared/types';
import { Server } from 'socket.io';
import { respawnPlayer, initPlayerLives } from './combat/EliminationSystem';
import { buildMovingPlatformStates } from './physics/MovingPlatform';
import { buildCrumblingPlatformStates } from './physics/CrumblingPlatform';

export class MatchManager {
  checkWinCondition(match: Match): string | null {
    if (match.state !== 'active') return null;

    const alivePlayers = match.players.filter(
      p => p.status === 'alive' || p.status === 'respawning'
    );

    if (alivePlayers.length === 1) {
      return alivePlayers[0].id;
    }
    if (alivePlayers.length === 0) {
      return 'draw';
    }
    return null;
  }

  endMatch(roomId: string, winnerId: string | null, match: Match, io: Server): void {
    match.state = 'ended';
    match.winner = winnerId;

    const winner = match.players.find(p => p.id === winnerId);
    io.to(roomId).emit('match:end', {
      winnerId,
      winnerName: winner?.name ?? 'Draw',
    });

    // Reset match after delay, process queue
    setTimeout(() => {
      this.resetMatch(match, io);
    }, 5000);
  }

  private resetMatch(match: Match, io: Server): void {
    match.state = 'lobby';
    match.tick = 0;
    match.winner = null;
    match.bombs = [];
    match.items = [];
    match.projectiles = [];
    match.movingPlatforms = [];
    match.crumblingPlatforms = [];
    match.mapVotes = {};

    // Reset players
    for (const player of match.players) {
      player.status = 'lobby';
      player.currentDamage = 0;
      player.velocity = { x: 0, y: 0 };
      player.currentWeapon = null;
      player.weaponCooldownUntil = 0;
      player.freezeUntil = 0;
      player.shieldSplitterUntil = 0;
      player.damageMitigation = 0;
    }

    // Move queued players in
    while (match.queue.length > 0 && match.players.length < match.maxPlayers) {
      const queued = match.queue.shift()!;
      queued.status = 'lobby';
      match.players.push(queued);
    }

    io.to(match.roomId).emit('room:update', match);
  }

  respawnPlayer(player: Player, spawnPoints: { x: number; y: number }[]): void {
    respawnPlayer(player, spawnPoints);
  }

  startNextRound(roomId: string, match: Match, io: Server): void {
    this.resetMatch(match, io);
  }

  initMatch(match: Match): void {
    const spawn = match.map.spawnPoints;
    match.players.forEach((player, i) => {
      initPlayerLives(player, match.mode);
      const sp = spawn[i % spawn.length];
      player.position = { x: sp.x, y: sp.y };
      player.velocity = { x: 0, y: 0 };
      player.status = 'alive';
      player.currentDamage = 0;
      player.isGrounded = false;
      player.jumpsRemaining = 2;
      player.invulnerableUntil = Date.now() + 1000;
      player.isBlocking = false;
      player.blockCooldown = 0;
      player.currentWeapon = null;
      player.weaponCooldownUntil = 0;
      player.freezeUntil = 0;
      player.shieldSplitterUntil = 0;
      player.damageMitigation = 0;
    });
    match.bombs = [];
    match.items = [];
    match.projectiles = [];
    match.state = 'active';
    match.tick = 0;

    // Initialize dynamic platform states from map definition
    buildMovingPlatformStates(match);
    buildCrumblingPlatformStates(match);
  }
}

