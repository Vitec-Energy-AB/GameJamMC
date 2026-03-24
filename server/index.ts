import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { SessionManager } from './SessionManager';
import { RoomManager } from './RoomManager';
import { LobbyManager } from './LobbyManager';
import { GameLoop } from './GameLoop';
import { MatchManager } from './MatchManager';
import { MapSelector, AVAILABLE_MAPS } from './MapSelector';
import { performAttack } from './combat/MeleeAttack';
import { createBomb } from './combat/BombSystem';
import { CHARACTERS, getCharacter } from '../shared/characters';

const app = express();
const httpServer = createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN },
});

const PORT = process.env.PORT ?? 7331;

// Rate-limit page requests to mitigate abuse of file-system access routes
const pageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.static(path.join(__dirname, '../../client')));
app.use('/sprites', express.static(path.join(__dirname, '../../Sprites')));
app.use('/resources', express.static(path.join(__dirname, '../../Resources')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/:roomId', pageRateLimit, (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

app.get('/', pageRateLimit, (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

const sessionManager = new SessionManager();
const roomManager = new RoomManager();
const matchManager = new MatchManager();
const gameLoop = new GameLoop(matchManager);
const lobbyManager = new LobbyManager(matchManager, gameLoop);
const mapSelector = new MapSelector();

// Track player → room mapping
const playerRoom = new Map<string, string>();

io.on('connection', (socket) => {
  const sessionId = sessionManager.createSession(socket.id);
  console.log(`[connect] ${socket.id} session=${sessionId}`);

  socket.on('room:join', (data: { roomId: string; name: string; mode?: 'stock' | 'knockout'; character?: string }) => {
    const roomId = data.roomId || 'lobby';
    const match = roomManager.getOrCreateRoom(roomId);

    if (data.mode) match.mode = data.mode;

    const characterId = data.character && getCharacter(data.character) ? data.character : 'bjork';
    const characterStats = getCharacter(characterId)!;

    const player = {
      id: socket.id,
      name: data.name || `Player${Math.floor(Math.random() * 1000)}`,
      character: characterId,
      position: { x: 400, y: 580 },
      velocity: { x: 0, y: 0 },
      facing: 'right' as const,
      currentDamage: 0,
      currentLives: 3,
      isBlocking: false,
      blockCooldown: 0,
      isGrounded: false,
      jumpsRemaining: characterStats.maxJumps,
      status: 'lobby' as const,
      invulnerableUntil: 0,
      inputState: {
        left: false, right: false, jump: false,
        attack: false, block: false, throwBomb: false,
        pickup: false, useWeapon: false,
      },
      currentWeapon: null,
      weaponCooldownUntil: 0,
      bombCooldownUntil: 0,
      freezeUntil: 0,
      shieldSplitterUntil: 0,
      damageMitigation: 0,
      color: characterStats.color,
    };

    socket.join(roomId);
    playerRoom.set(socket.id, roomId);

    const added = roomManager.addPlayerToRoom(roomId, player);

    if (!added) {
      lobbyManager.handleQueuedPlayer(roomId, socket.id, io);
      socket.emit('room:joined', { match, queued: true });
    } else {
      socket.emit('room:joined', { match, queued: false, availableMaps: AVAILABLE_MAPS.map(m => ({ id: m.id, name: m.map.name, description: m.description })), availableCharacters: CHARACTERS });
      io.to(roomId).emit('room:update', match);
    }
  });

  socket.on('player:ready', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match) return;
    lobbyManager.handlePlayerReady(roomId, socket.id, match, io);
  });

  socket.on('map:vote', (data: { mapId: string }) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match || match.state !== 'lobby') return;
    mapSelector.handleVote(match, socket.id, data.mapId, io);
  });

  socket.on('input:update', (inputState) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match) return;
    const player = match.players.find(p => p.id === socket.id);
    if (!player) return;
    player.inputState = inputState;
  });

  socket.on('player:attack', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match || match.state !== 'active') return;
    const player = match.players.find(p => p.id === socket.id);
    if (!player || player.status !== 'alive') return;

    // If player has a melee weapon, use its stats
    let weaponOverride: { damage: number; knockbackModifier: number } | undefined;
    if (player.currentWeapon && player.currentWeapon.category === 'melee') {
      // Capture stats before handleMeleeWeaponAttack may null out currentWeapon on last durability hit
      weaponOverride = {
        damage: player.currentWeapon.damage,
        knockbackModifier: player.currentWeapon.knockbackModifier,
      };
      gameLoop.getItemSpawnManager().handleMeleeWeaponAttack(match, socket.id, io);
    }

    const results = performAttack(player, match.players, weaponOverride);
    if (results.length > 0) {
      io.to(roomId).emit('player:hit', { results, type: 'melee', attackerId: socket.id });
    }
  });

  socket.on('player:block', (blocking: boolean) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match) return;
    const player = match.players.find(p => p.id === socket.id);
    if (!player) return;
    const now = Date.now();
    if (blocking) {
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
  });

  socket.on('player:throwBomb', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match || match.state !== 'active') return;
    const player = match.players.find(p => p.id === socket.id);
    if (!player || player.status !== 'alive') return;

    const now = Date.now();
    if (player.bombCooldownUntil > now) return;
    player.bombCooldownUntil = now + 2000;

    const bomb = createBomb(player, player.facing);
    match.bombs.push(bomb);
    io.to(roomId).emit('bomb:thrown', { bomb });
  });

  socket.on('item:pickup', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match || match.state !== 'active') return;
    gameLoop.getItemSpawnManager().handlePickup(match, socket.id, io);
  });

  socket.on('item:use', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match || match.state !== 'active') return;
    const player = match.players.find(p => p.id === socket.id);
    if (!player || player.status !== 'alive') return;

    if (player.currentWeapon && player.currentWeapon.category === 'melee') {
      // Capture weapon stats before handleMeleeWeaponAttack may null out currentWeapon
      const weaponOverride = {
        damage: player.currentWeapon.damage,
        knockbackModifier: player.currentWeapon.knockbackModifier,
      };
      // Decrement durability and apply weapon cooldown
      gameLoop.getItemSpawnManager().handleMeleeWeaponAttack(match, socket.id, io);
      const results = performAttack(player, match.players, weaponOverride);
      if (results.length > 0) {
        io.to(roomId).emit('player:hit', { results, type: 'melee', attackerId: socket.id });
      }
    } else {
      // Thrown weapons: launch projectile
      gameLoop.getItemSpawnManager().handleUseWeapon(match, socket.id, io);
    }
  });

  socket.on('match:start', () => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const match = roomManager.getRoom(roomId);
    if (!match) return;
    gameLoop.startGame(roomId, match, io);
  });

  socket.on('disconnect', () => {
    const roomId = playerRoom.get(socket.id);
    sessionManager.removeSession(socket.id);
    if (roomId) {
      roomManager.removePlayer(roomId, socket.id);
      io.to(roomId).emit('player:disconnect', { playerId: socket.id });
      const match = roomManager.getRoom(roomId);
      if (match) io.to(roomId).emit('room:update', match);
      playerRoom.delete(socket.id);
    }
    console.log(`[disconnect] ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };

