import { Player, Platform, Bomb, Match } from '../shared/types';

const PLAYER_W = 80, PLAYER_H = 120;

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  clear(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, 1200, 700);
  }

  private platformPath(x: number, y: number, w: number, h: number, r: number): void {
    if (r > h / 2) r = h / 2;
    if (r > w / 2) r = w / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arcTo(x + w, y, x + w, y + r, r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.arcTo(x, y + h, x, y + h - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
    this.ctx.closePath();
  }

  drawPlatforms(platforms: Platform[]): void {
    for (const p of platforms) {
      const r = Math.min(5, p.height / 2, p.width / 2);
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0,0,0,0.35)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 3;
      this.platformPath(p.x, p.y, p.width, p.height, r);
      if (p.type === 'solid') {
        const grad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, '#5c6080');
        grad.addColorStop(0.5, '#4a4e69');
        grad.addColorStop(1, '#22223b');
        this.ctx.fillStyle = grad;
      } else {
        const grad = this.ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
        grad.addColorStop(0, '#dbb534');
        grad.addColorStop(0.5, '#c9a227');
        grad.addColorStop(1, '#a88520');
        this.ctx.fillStyle = grad;
      }
      this.ctx.fill();
      this.ctx.restore();
      this.platformPath(p.x, p.y, p.width, p.height, r);
      this.ctx.strokeStyle = p.type === 'solid' ? '#9a8c98' : 'rgba(168,133,32,0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
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
