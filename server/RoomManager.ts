import { Match, Player, RoomInfo } from '../shared/types';
import { testArena } from './maps/TestArena';
import { DEFAULT_LAVA_RISE_SPEED, DEFAULT_LAVA_DAMAGE, DEFAULT_START_DELAY, DEFAULT_ACCELERATION } from './physics/LavaSystem';

const PLAYER_COLORS = [
  '#FF4444', '#4444FF', '#44FF44', '#FFAA00',
  '#FF44FF', '#44FFFF', '#FF8844', '#8844FF',
  '#44FF88', '#FF4488',
];

export class RoomManager {
  private rooms: Map<string, Match> = new Map();
  private roomCounter: number = 0;

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

  createRoom(hostId: string, hostName: string, displayName?: string): string {
    this.roomCounter++;
    const roomId = `room-${Date.now()}-${this.roomCounter}`;
    const roomDisplayName = displayName || `Rum #${this.roomCounter}`;

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
      hostId,
      displayName: roomDisplayName,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, match);
    return roomId;
  }

  getRoomList(): RoomInfo[] {
    const roomList: RoomInfo[] = [];

    this.rooms.forEach((match) => {
      const host = match.players.find(p => p.id === match.hostId);
      const hostName = host ? host.name : 'Unknown';
      const canJoin = match.state === 'lobby' || match.state === 'ended';

      roomList.push({
        roomId: match.roomId,
        name: match.displayName || match.roomId,
        state: match.state,
        playerCount: match.players.length,
        maxPlayers: match.maxPlayers,
        hostName,
        selectedMap: match.selectedMap,
        canJoin,
        createdAt: match.createdAt || Date.now(),
      });
    });

    return roomList.sort((a, b) => b.createdAt - a.createdAt);
  }

  cleanupEmptyRooms(): void {
    const emptyRooms: string[] = [];

    this.rooms.forEach((match, roomId) => {
      if (match.players.length === 0 && match.queue.length === 0) {
        emptyRooms.push(roomId);
      }
    });

    emptyRooms.forEach(roomId => this.rooms.delete(roomId));
  }
}

