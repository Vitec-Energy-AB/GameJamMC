import { Match } from '../shared/types';
import { Server } from 'socket.io';
import { MatchManager } from './MatchManager';
import { GameLoop } from './GameLoop';
import { MapSelector } from './MapSelector';
import { RoomManager } from './RoomManager';

export class LobbyManager {
  private matchManager: MatchManager;
  private gameLoop: GameLoop;
  private mapSelector: MapSelector;
  private roomManager: RoomManager;

  constructor(matchManager: MatchManager, gameLoop: GameLoop, roomManager: RoomManager) {
    this.matchManager = matchManager;
    this.gameLoop = gameLoop;
    this.mapSelector = new MapSelector();
    this.roomManager = roomManager;
  }

  handlePlayerReady(roomId: string, socketId: string, match: Match, io: Server): void {
    const player = match.players.find(p => p.id === socketId);
    if (!player) return;
    player.status = 'ready';
    io.to(roomId).emit('room:update', match);

    const allReady = match.players.length >= 2 &&
      match.players.every(p => p.status === 'ready' || p.isBot);
    if (allReady) {
      this.startCountdown(roomId, match, io);
    }
  }

  startCountdown(roomId: string, match: Match, io: Server): void {
    match.state = 'countdown';
    io.emit('rooms:update', this.roomManager.getRoomList());

    // Resolve map selection based on votes
    this.mapSelector.selectMap(match, io);

    let count = 3;
    io.to(roomId).emit('match:countdown', { count, selectedMap: match.selectedMap });

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        io.to(roomId).emit('match:countdown', { count, selectedMap: match.selectedMap });
      } else {
        clearInterval(interval);
        this.matchManager.initMatch(match);
        this.gameLoop.startGame(roomId, match, io);
        io.to(roomId).emit('match:start', match);
        io.emit('rooms:update', this.roomManager.getRoomList());
      }
    }, 1000);
  }

  handleQueuedPlayer(roomId: string, playerId: string, io: Server): void {
    io.to(playerId).emit('match:queued', { message: 'You are in the queue. Please wait for the next match.' });
  }
}
