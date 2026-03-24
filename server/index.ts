import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { SessionManager } from './SessionManager';
import { RoomManager } from './RoomManager';
import { LobbyManager } from './LobbyManager';
import { GameLoop } from './GameLoop';
import { MatchManager } from './MatchManager';
import { performAttack } from './combat/MeleeAttack';
import { createBomb } from './combat/BombSystem';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT ?? 3000;

app.use(express.static(path.join(__dirname, '../../client')));

app.get('/:roomId', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/index.html'));
});

const sessionManager = new SessionManager();
const roomManager = new RoomManager();
const matchManager = new MatchManager();
const lobbyManager = new LobbyManager(matchManager);
const gameLoop = new GameLoop(matchManager);

// Track player → room mapping
const playerRoom = new Map<string, string>();

io.on('connection', (socket) => {
  const sessionId = sessionManager.createSession(socket.id);
  console.log(`[connect] ${socket.id} session=${sessionId}`);

  socket.on('room:join', (data: { roomId: string; name: string; mode?: 'stock' | 'knockout' }) => {
    const roomId = data.roomId || 'lobby';
    const match = roomManager.getOrCreateRoom(roomId);

    if (data.mode) match.mode = data.mode;

    const player = {
      id: socket.id,
      name: data.name || `Player${Math.floor(Math.random() * 1000)}`,
      position: { x: 400, y: 580 },
      velocity: { x: 0, y: 0 },
      facing: 'right' as const,
      currentDamage: 0,
      currentLives: 3,
      isBlocking: false,
      blockCooldown: 0,
      isGrounded: false,
      jumpsRemaining: 2,
      status: 'lobby' as const,
      invulnerableUntil: 0,
      inputState: {
        left: false, right: false, jump: false,
        attack: false, block: false, throwBomb: false,
      },
    };

    socket.join(roomId);
    playerRoom.set(socket.id, roomId);

    const added = roomManager.addPlayerToRoom(roomId, player);

    if (!added) {
      lobbyManager.handleQueuedPlayer(roomId, socket.id, io);
      socket.emit('room:joined', { match, queued: true });
    } else {
      socket.emit('room:joined', { match, queued: false });
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

    const results = performAttack(player, match.players);
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

    const bomb = createBomb(player, player.facing);
    match.bombs.push(bomb);
    io.to(roomId).emit('bomb:thrown', { bomb });
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
