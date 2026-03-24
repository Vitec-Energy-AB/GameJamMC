import { Match, Player } from '../shared/types';
import { testArena } from './maps/TestArena';
import { DEFAULT_LAVA_RISE_SPEED, DEFAULT_LAVA_DAMAGE, DEFAULT_START_DELAY, DEFAULT_ACCELERATION } from './physics/LavaSystem';

const PLAYER_COLORS = [
  '#FF4444', '#4444FF', '#44FF44', '#FFAA00',
  '#FF44FF', '#44FFFF', '#FF8844', '#8844FF',
  '#44FF88', '#FF4488',
];

export class RoomManager {
  private rooms: Map<string, Match> = new Map();

  getOrCreateRoom(roomId: string): Match {
    if (!this.rooms.has(roomId)) {
      const match: Match = {
        roomId,
        state: 'lobby',
        players: [],
        queue: [],
        map: { ...testArena },
        mode: 'stock',
        tick: 0,
        winner: null,
        maxPlayers: 10,
        bombs: [],
        items: [],
        projectiles: [],
        movingPlatforms: [],
        crumblingPlatforms: [],
        mapVotes: {},
        selectedMap: 'testArena',
        lavaState: {
          active: true,
          currentY: testArena.blastZones.bottom,
          riseSpeed: DEFAULT_LAVA_RISE_SPEED,
          baseDamage: DEFAULT_LAVA_DAMAGE,
          startDelay: DEFAULT_START_DELAY,
          startedAt: 0,
          accelerationRate: DEFAULT_ACCELERATION,
        },
      };
      this.rooms.set(roomId, match);
    }
    return this.rooms.get(roomId)!;
  }

  addPlayerToRoom(roomId: string, player: Player): boolean {
    const match = this.getOrCreateRoom(roomId);
    if (match.state === 'active' || match.state === 'countdown') {
      player.status = 'queued';
      match.queue.push(player);
      return false;
    }
    if (match.players.length >= match.maxPlayers) {
      player.status = 'queued';
      match.queue.push(player);
      return false;
    }
    player.color = PLAYER_COLORS[match.players.length % PLAYER_COLORS.length];
    match.players.push(player);
    return true;
  }

  removePlayer(roomId: string, socketId: string): void {
    const match = this.rooms.get(roomId);
    if (!match) return;
    match.players = match.players.filter(p => p.id !== socketId);
    match.queue = match.queue.filter(p => p.id !== socketId);
    if (match.players.length === 0 && match.queue.length === 0) {
      this.rooms.delete(roomId);
    }
  }

  getRoom(roomId: string): Match | null {
    return this.rooms.get(roomId) ?? null;
  }

  getAllRooms(): Map<string, Match> {
    return this.rooms;
  }
}

