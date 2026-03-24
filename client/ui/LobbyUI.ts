import { Match } from '../../shared/types';

export class LobbyUI {
  private overlay: HTMLElement;
  private playerListDiv: HTMLElement;
  private countdownDiv: HTMLElement;
  private statusMsg: HTMLElement;
  private queueMsg: HTMLElement;

  constructor() {
    this.overlay = document.getElementById('lobbyOverlay')!;
    this.playerListDiv = document.getElementById('playerList')!;
    this.countdownDiv = document.getElementById('countdown')!;
    this.statusMsg = document.getElementById('statusMsg')!;
    this.queueMsg = document.getElementById('queueMsg')!;
  }

  show(): void { this.overlay.style.display = 'flex'; }
  hide(): void { this.overlay.style.display = 'none'; }

  updatePlayerList(players: Match['players'], localId: string | null): void {
    this.playerListDiv.innerHTML = '';
    players.forEach(p => {
      const el = document.createElement('div');
      el.className = 'player-entry';
      el.textContent = `${p.name}${p.id === localId ? ' (you)' : ''} - ${p.status}`;
      this.playerListDiv.appendChild(el);
    });
  }

  showCountdown(count: number): void {
    this.countdownDiv.style.display = 'block';
    this.countdownDiv.textContent = String(count);
  }

  showQueuePosition(message: string): void {
    this.queueMsg.style.display = 'block';
    this.queueMsg.textContent = message;
  }

  setStatus(msg: string): void {
    this.statusMsg.textContent = msg;
  }
}
