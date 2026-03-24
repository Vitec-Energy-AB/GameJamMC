import { Player, Platform, Bomb, Match } from '../shared/types';

const PLAYER_W = 40, PLAYER_H = 60;

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  clear(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, 1200, 700);
  }

  drawPlatforms(platforms: Platform[]): void {
    for (const p of platforms) {
      this.ctx.fillStyle = p.type === 'solid' ? '#4a4e69' : '#c9a227';
      this.ctx.fillRect(p.x, p.y, p.width, p.height);
    }
  }

  drawPlayers(players: Player[], localPlayerId: string | null): void {
    for (const p of players) {
      if (p.status === 'eliminated') continue;
      this.ctx.fillStyle = p.color || '#888';
      this.ctx.fillRect(p.position.x, p.position.y, PLAYER_W, PLAYER_H);
    }
  }

  drawBombs(bombs: Bomb[]): void {
    for (const b of bombs) {
      this.ctx.fillStyle = '#ff6600';
      this.ctx.beginPath();
      this.ctx.arc(b.position.x + 8, b.position.y + 8, 10, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawHUD(match: Match): void {
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, 1200, 50);
  }

  drawBlastZones(blastZones: Match['map']['blastZones']): void {
    this.ctx.strokeStyle = 'rgba(255,50,50,0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(2, 2, 1196, 696);
  }
}
