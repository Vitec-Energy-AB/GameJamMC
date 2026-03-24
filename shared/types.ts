export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  block: boolean;
  throwBomb: boolean;
  pickup: boolean;
  useWeapon: boolean;
}

export interface WeaponItem {
  id: string;
  type: 'steelclub' | 'lasergun' | 'fireaxe' | 'lightningspear' | 'icecrystal';
  category: 'melee' | 'thrown';
  position: { x: number; y: number };
  pickedUpBy: string | null;
  durability: number;
  ammo: number;
  damage: number;
  knockbackModifier: number;
  attackCooldown: number;
  rarity: 'common' | 'uncommon' | 'rare';
  spawnTime: number;
  active: boolean;
}

export interface PowerupItem {
  id: string;
  type: 'shieldsplitter' | 'lifecore';
  position: { x: number; y: number };
  active: boolean;
  spawnTime: number;
}

export type SpawnedItem = WeaponItem | PowerupItem;

export interface Projectile {
  id: string;
  type: 'lightningspear' | 'icecrystal';
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  thrownBy: string;
  damage: number;
  knockbackModifier: number;
  active: boolean;
}

export interface MovingPlatformDef {
  platform: Platform;
  minX: number;
  maxX: number;
  speed: number;
}

export interface MovingPlatformState {
  id: string;
  def: MovingPlatformDef;
  currentX: number;
  direction: number;
}

export interface CrumblingPlatformDef {
  platform: Platform;
}

export interface CrumblingPlatformState {
  id: string;
  def: CrumblingPlatformDef;
  state: 'solid' | 'crumbling' | 'gone';
  crumbleStart: number;
  respawnAt: number;
}

export interface Player {
  id: string;
  name: string;
  /** Selected character id (e.g. 'bjork', 'gnista', 'malm', 'dimma') */
  character?: string;
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
  currentWeapon: WeaponItem | null;
  weaponCooldownUntil: number;
  bombCooldownUntil: number;
  freezeUntil: number;
  shieldSplitterUntil: number;
  damageMitigation: number;
  isAttacking?: boolean;
  attackAnimUntil?: number;
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
  movingPlatforms?: MovingPlatformDef[];
  crumblingPlatforms?: CrumblingPlatformDef[];
}

export interface LavaState {
  active: boolean;
  currentY: number;
  riseSpeed: number;
  baseDamage: number;
  startDelay: number;
  startedAt: number;
  accelerationRate: number;
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
  items: SpawnedItem[];
  projectiles: Projectile[];
  movingPlatforms: MovingPlatformState[];
  crumblingPlatforms: CrumblingPlatformState[];
  mapVotes: { [playerId: string]: string };
  selectedMap: string;
  lavaState: LavaState;
}

export interface HitResult {
  targetId: string;
  damage: number;
  knockback: { x: number; y: number };
  blocked: boolean;
}
