import { Server } from 'socket.io';
import { Match } from '../shared/types';
import { applyMovement } from './physics/Movement';
import { applyGravity, applyJump } from './physics/Gravity';
import { checkPlatformCollisions } from './physics/Collision';
import { updateBomb, checkBombCollisions } from './physics/Projectile';
import { updateBlock } from './combat/BlockSystem';
import { checkBlastZones, eliminatePlayer, respawnPlayer } from './combat/EliminationSystem';
import { MatchManager } from './MatchManager';
import { explodeBomb } from './combat/BombSystem';
import { updateMovingPlatforms } from './physics/MovingPlatform';
import { updateCrumblingPlatforms, getCrumblingPlatformForCollision } from './physics/CrumblingPlatform';
import { ItemSpawnManager } from './items/ItemSpawnManager';
import { initLavaState, updateLava, resetLavaDamageTracking } from './physics/LavaSystem';
import { initPlatformGenerator, updatePlatformGeneration, resetPlatformGenerator } from './physics/PlatformGenerator';
import { BotManager } from './bots/BotManager';

const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

const AUTO_DEATH_DAMAGE_THRESHOLD = 800;
const OVERDAMAGE_VERTICAL_VELOCITY = -2000;
const OVERDAMAGE_HORIZONTAL_VELOCITY = 1500;

export class GameLoop {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private jumpPressed: Map<string, boolean> = new Map();
  private duckStartTimes: Map<string, number> = new Map();
  private matchManager: MatchManager;
  private itemSpawnManager: ItemSpawnManager;
  private botManager: BotManager;

  constructor(matchManager: MatchManager, botManager?: BotManager) {
    this.matchManager = matchManager;
    this.itemSpawnManager = new ItemSpawnManager();
    this.botManager = botManager ?? new BotManager();
  }

  startGame(roomId: string, match: Match, io: Server): void {
    if (this.intervals.has(roomId)) {
      clearInterval(this.intervals.get(roomId)!);
    }

    let lastTime = Date.now();

    // Initialize rising lava
    initLavaState(match);
    initPlatformGenerator(match);

    const loop = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms to prevent physics spiral-of-death on lag spikes
      lastTime = now;

      if (match.state !== 'active') return;

      match.tick++;

      // Update moving platforms
      updateMovingPlatforms(match, dt);

      // Update crumbling platforms
      updateCrumblingPlatforms(match, io);

      // Build combined platform list for collision (static + active moving + active crumbling)
      const allPlatforms = [
        ...match.map.platforms,
        ...match.movingPlatforms.map(mp => mp.def.platform),
        ...match.crumblingPlatforms
          .map(cp => getCrumblingPlatformForCollision(cp))
          .filter((p): p is NonNullable<typeof p> => p !== null),
      ];

      // Process each player
      for (const player of match.players) {
        if (player.status !== 'alive') {
          // Handle respawning
          if (player.status === 'respawning' && player.respawnTimer !== undefined) {
            if (now >= player.respawnTimer) {
              const lavaY = match.lavaState?.active ? match.lavaState.currentY : undefined;
              respawnPlayer(player, match.map.spawnPoints, lavaY);
              io.to(roomId).emit('player:respawn', { playerId: player.id, position: player.position });
            }
          }
          continue;
        }

        // Force field: keep player invulnerable while active
        if ((player.forceFieldUntil ?? 0) > now) {
          player.invulnerableUntil = Math.max(player.invulnerableUntil, now + 100);
        }

        // Jump handling
        const prevJump = this.jumpPressed.get(player.id) ?? false;
        if (player.inputState.jump && !prevJump) {
          applyJump(player);
        }
        this.jumpPressed.set(player.id, player.inputState.jump);

        // Duck handling
        if (player.inputState.duck) {
          player.isDucking = true;

          // Track duck start time for drop-down mechanic
          if (!this.duckStartTimes.has(player.id)) {
            this.duckStartTimes.set(player.id, now);
          }

          const duckDuration = now - (this.duckStartTimes.get(player.id) ?? now);

          // After 2 seconds of holding duck, enable drop-down through passthrough platforms
          if (duckDuration >= 2000 && player.isGrounded) {
            // Drop player down by moving them below their current platform
            player.position.y += 10;
            player.isGrounded = false;
            player.isDucking = false;
            this.duckStartTimes.delete(player.id);
          }
        } else {
          player.isDucking = false;
          this.duckStartTimes.delete(player.id);
        }

        // Block handling
        if (player.inputState.block) {
          if (!player.isBlocking && (player.blockCooldown ?? 0) <= now) {
            player.isBlocking = true;
            player.blockDuration = now + 2000;
          }
        } else {
          if (player.isBlocking) {
            player.isBlocking = false;
            player.blockCooldown = now + 3000;
          }
        }
        updateBlock(player, dt);

        // Clear attack animation flag after duration expires
        if (player.isAttacking && player.attackAnimUntil !== undefined && now >= player.attackAnimUntil) {
          player.isAttacking = false;
        }
        // Physics
        applyMovement(player, dt);
        applyGravity(player, dt);
        checkPlatformCollisions(player, allPlatforms, dt);

        // Blast zone check
        if (checkBlastZones(player, match.map.blastZones)) {
          eliminatePlayer(player, match, io);
        }

        // Auto-death at 800% damage
        if (player.status === 'alive' && player.currentDamage >= AUTO_DEATH_DAMAGE_THRESHOLD) {
          player.velocity.y = OVERDAMAGE_VERTICAL_VELOCITY;
          player.velocity.x = (Math.random() < 0.5 ? 1 : -1) * OVERDAMAGE_HORIZONTAL_VELOCITY;
          io.to(match.roomId).emit('player:overdamage', { playerId: player.id });
          eliminatePlayer(player, match, io);
        }
      }

      // Auto-pickup items for all alive players
      this.itemSpawnManager.checkAutoPickup(match, io);

      // === BOT AI UPDATE ===
      this.botManager.updateBots(match, now);

      // Reset inLava flag before lava update so gravity skips work on previous-tick state
      for (const player of match.players) {
        if (player.status === 'alive') player.inLava = false;
      }

      // Update rising lava
      updateLava(match, dt, io);

      // Update platform generation
      const activePlayers = match.players.filter(p => p.status === 'alive' || p.status === 'respawning');
      const highestPlayerY = activePlayers.length > 0
        ? Math.min(...activePlayers.map(p => p.position.y))
        : 600; // fallback to typical spawn area when no active players
      updatePlatformGeneration(match, io, highestPlayerY);

      // Update bombs
      for (let i = match.bombs.length - 1; i >= 0; i--) {
        const bomb = match.bombs[i];
        updateBomb(bomb, dt);
        checkBombCollisions(bomb, allPlatforms, dt);

        if (bomb.fuseTimer <= 0) {
          // Explode
          const results = explodeBomb(bomb, match.players);
          if (results.length > 0) {
            io.to(roomId).emit('player:hit', { results, type: 'bomb', bombId: bomb.id });
          }
          io.to(roomId).emit('bomb:explode', { bombId: bomb.id, position: bomb.position });
          match.bombs.splice(i, 1);
        }
      }

      // Update projectiles (thrown weapons)
      this.itemSpawnManager.updateProjectiles(match, io, dt);

      // Item spawn / despawn
      this.itemSpawnManager.trySpawnItems(match, io);
      this.itemSpawnManager.updateItems(match, io);

      // Check win condition
      const winnerId = this.matchManager.checkWinCondition(match);
      if (winnerId !== null) {
        this.matchManager.endMatch(roomId, winnerId, match, io);
        this.stopGame(roomId);
        return;
      }

      // Broadcast state
      io.to(roomId).emit('state:update', {
        tick: match.tick,
        players: match.players,
        bombs: match.bombs,
        items: match.items,
        projectiles: match.projectiles,
        lavaY: match.lavaState?.currentY ?? null,
        platforms: match.map.platforms,
        movingPlatforms: match.movingPlatforms.map(mp => ({
          id: mp.id,
          platform: mp.def.platform,
        })),
        crumblingPlatforms: match.crumblingPlatforms.map(cp => ({
          id: cp.id,
          platform: cp.def.platform,
          state: cp.state,
        })),
      });
    }, TICK_INTERVAL);

    this.intervals.set(roomId, loop);
  }

  stopGame(roomId: string): void {
    const interval = this.intervals.get(roomId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(roomId);
    }
    resetLavaDamageTracking(roomId);
    resetPlatformGenerator(roomId);
  }

  getItemSpawnManager(): ItemSpawnManager {
    return this.itemSpawnManager;
  }

  getBotManager(): BotManager {
    return this.botManager;
  }
}

