export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  block: boolean;
  throwBomb: boolean;
}

export interface Player {
  id: string;
  name: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: 'left' | 'right';
  currentDamage: number;
  currentLives: number;
  isBlocking: boolean;
  blockCooldown: number;
  isGrounded: boolean;
  jumpsRemaining: number;
  status: 'lobby' | 'ready' | 'queued' | 'alive' | 'respawning' | 'eliminated';
  invulnerableUntil: number;
  inputState: InputState;
  color?: string;
  attackCooldown?: number;
  blockDuration?: number;
  respawnTimer?: number;
}

export interface Bomb {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  thrownBy: string;
  fuseTimer: number;
  explosionRadius: number;
  damage: number;
  knockbackMultiplier: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'solid' | 'passthrough';
}

export interface GameMap {
  name: string;
  platforms: Platform[];
  spawnPoints: { x: number; y: number }[];
  itemSpawnPoints: { x: number; y: number }[];
  blastZones: { top: number; bottom: number; left: number; right: number };
}

export interface Match {
  roomId: string;
  state: 'lobby' | 'countdown' | 'active' | 'ended';
  players: Player[];
  queue: Player[];
  map: GameMap;
  mode: 'stock' | 'knockout';
  tick: number;
  winner: string | null;
  maxPlayers: number;
  bombs: Bomb[];
}

export interface HitResult {
  targetId: string;
  damage: number;
  knockback: { x: number; y: number };
  blocked: boolean;
}
