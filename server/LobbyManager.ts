import { Match } from '../shared/types';
import { Server } from 'socket.io';
import { MatchManager } from './MatchManager';

export class LobbyManager {
  private matchManager: MatchManager;

  constructor(matchManager: MatchManager) {
    this.matchManager = matchManager;
  }

  handlePlayerReady(roomId: string, socketId: string, match: Match, io: Server): void {
    const player = match.players.find(p => p.id === socketId);
    if (!player) return;
    player.status = 'ready';
    io.to(roomId).emit('room:update', match);

    const allReady = match.players.length >= 2 &&
      match.players.every(p => p.status === 'ready');
    if (allReady) {
      this.startCountdown(roomId, match, io);
    }
  }

  startCountdown(roomId: string, match: Match, io: Server): void {
    match.state = 'countdown';
    let count = 3;
    io.to(roomId).emit('match:countdown', { count });

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        io.to(roomId).emit('match:countdown', { count });
      } else {
        clearInterval(interval);
        this.matchManager.initMatch(match);
        io.to(roomId).emit('match:start', match);
      }
    }, 1000);
  }

  handleQueuedPlayer(roomId: string, playerId: string, io: Server): void {
    io.to(playerId).emit('match:queued', { message: 'You are in the queue. Please wait for the next match.' });
  }
}
