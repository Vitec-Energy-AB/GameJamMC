import { v4 as uuidv4 } from 'uuid';
import { WeaponItem, PowerupItem, SpawnedItem, Match, Player, Projectile } from '../../shared/types';
import { Server } from 'socket.io';

const ITEM_DESPAWN_MS = 15000;
const SPAWN_COOLDOWN_MS = 8000;

type WeaponType = WeaponItem['type'];
type PowerupType = PowerupItem['type'];

// Projectile travel speeds (px/s)
const LIGHTNINGSPEAR_SPEED = 800;
const ICECRYSTAL_SPEED = 400;

interface WeaponTemplate {
  type: WeaponType;
  category: WeaponItem['category'];
  damage: number;
  knockbackModifier: number;
  attackCooldown: number;
  durability: number;
  ammo: number;
  rarity: WeaponItem['rarity'];
}

const WEAPON_TEMPLATES: WeaponTemplate[] = [
  {
    type: 'steelclub',
    category: 'melee',
    damage: 20,
    knockbackModifier: 1.8,
    attackCooldown: 600,
    durability: 8,
    ammo: 0,
    rarity: 'uncommon',
  },
  {
    type: 'energyblade',
    category: 'melee',
    damage: 8,
    knockbackModifier: 0.8,
    attackCooldown: 200,
    durability: 15,
    ammo: 0,
    rarity: 'common',
  },
  {
    type: 'fireaxe',
    category: 'melee',
    damage: 15,
    knockbackModifier: 1.2,
    attackCooldown: 400,
    durability: 10,
    ammo: 0,
    rarity: 'common',
  },
  {
    type: 'lightningspear',
    category: 'thrown',
    damage: 18,
    knockbackModifier: 1.3,
    attackCooldown: 500,
    durability: 0,
    ammo: 3,
    rarity: 'rare',
  },
  {
    type: 'icecrystal',
    category: 'thrown',
    damage: 12,
    knockbackModifier: 1.0,
    attackCooldown: 700,
    durability: 0,
    ammo: 2,
    rarity: 'uncommon',
  },
];

const POWERUP_TYPES: PowerupType[] = ['shieldsplitter', 'lifecore'];

// Rarity weights: common=60, uncommon=30, rare=10
const RARITY_WEIGHTS: Record<WeaponItem['rarity'], number> = {
  common: 60,
  uncommon: 30,
  rare: 10,
};

export class ItemSpawnManager {
  private spawnCooldowns: Map<string, number> = new Map();

  private pickRandomWeaponTemplate(): WeaponTemplate {
    const totalWeight = WEAPON_TEMPLATES.reduce((sum, t) => sum + RARITY_WEIGHTS[t.rarity], 0);
    let roll = Math.random() * totalWeight;
    for (const tmpl of WEAPON_TEMPLATES) {
      roll -= RARITY_WEIGHTS[tmpl.rarity];
      if (roll <= 0) return tmpl;
    }
    return WEAPON_TEMPLATES[0];
  }

  private spawnWeaponAt(position: { x: number; y: number }): WeaponItem {
    const tmpl = this.pickRandomWeaponTemplate();
    return {
      id: uuidv4(),
      type: tmpl.type,
      category: tmpl.category,
      position: { x: position.x, y: position.y },
      pickedUpBy: null,
      durability: tmpl.durability,
      ammo: tmpl.ammo,
      damage: tmpl.damage,
      knockbackModifier: tmpl.knockbackModifier,
      attackCooldown: tmpl.attackCooldown,
      rarity: tmpl.rarity,
      spawnTime: Date.now(),
      active: true,
    };
  }

  private spawnPowerupAt(position: { x: number; y: number }): PowerupItem {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    return {
      id: uuidv4(),
      type,
      position: { x: position.x, y: position.y },
      active: true,
      spawnTime: Date.now(),
    };
  }

  trySpawnItems(match: Match, io: Server): void {
    const now = Date.now();
    const spawnPoints = match.map.itemSpawnPoints;

    for (const sp of spawnPoints) {
      const key = `${sp.x},${sp.y}`;
      const cooldown = this.spawnCooldowns.get(key) ?? 0;
      if (now < cooldown) continue;

      // Check if a non-picked-up item already exists at this spawn point
      const occupied = match.items.some(item => {
        if (!item.active || ('pickedUpBy' in item && item.pickedUpBy !== null)) return false;
        const dx = item.position.x - sp.x;
        const dy = item.position.y - sp.y;
        return Math.sqrt(dx * dx + dy * dy) < 50;
      });
      if (occupied) continue;

      // 20% chance of powerup, 80% weapon
      const item: SpawnedItem = Math.random() < 0.2
        ? this.spawnPowerupAt(sp)
        : this.spawnWeaponAt(sp);

      match.items.push(item);
      io.to(match.roomId).emit('item:spawn', { item });
      this.spawnCooldowns.set(key, now + SPAWN_COOLDOWN_MS);
    }
  }

  updateItems(match: Match, io: Server): void {
    const now = Date.now();
    for (let i = match.items.length - 1; i >= 0; i--) {
      const item = match.items[i];
      if (!item.active) {
        match.items.splice(i, 1);
        continue;
      }
      // For weapons: skip if picked up
      if ('pickedUpBy' in item && item.pickedUpBy !== null) continue;

      // Auto-despawn after 15 seconds
      if (now - item.spawnTime > ITEM_DESPAWN_MS) {
        match.items.splice(i, 1);
        io.to(match.roomId).emit('item:drop', { itemId: item.id, despawned: true });
      }
    }
  }

  handlePickup(match: Match, playerId: string, io: Server): void {
    const player = match.players.find(p => p.id === playerId);
    if (!player || player.status !== 'alive') return;

    const now = Date.now();
    const PICKUP_RANGE = 40;

    for (let i = 0; i < match.items.length; i++) {
      const item = match.items[i];
      if (!item.active) continue;

      // Weapons: not yet picked up
      if ('pickedUpBy' in item) {
        if (item.pickedUpBy !== null) continue;
      }

      const dx = player.position.x + 20 - item.position.x;
      const dy = player.position.y + 30 - item.position.y;
      if (Math.sqrt(dx * dx + dy * dy) > PICKUP_RANGE) continue;

      if ('pickedUpBy' in item) {
        // It's a weapon
        const weapon = item as WeaponItem;

        // Drop existing weapon
        if (player.currentWeapon) {
          const dropped = player.currentWeapon;
          dropped.pickedUpBy = null;
          dropped.position = { x: player.position.x, y: player.position.y };
          dropped.spawnTime = now;
          match.items.push(dropped);
          io.to(match.roomId).emit('item:drop', { itemId: dropped.id, position: dropped.position, despawned: false });
        }

        weapon.pickedUpBy = playerId;
        player.currentWeapon = weapon;
        player.weaponCooldownUntil = 0;
        io.to(match.roomId).emit('item:pickup', { itemId: weapon.id, playerId });
        break;
      } else {
        // It's a powerup
        const powerup = item as PowerupItem;
        this.applyPowerup(player, powerup, now);
        powerup.active = false;
        match.items.splice(i, 1);
        io.to(match.roomId).emit('item:pickup', { itemId: powerup.id, playerId, powerupType: powerup.type });
        break;
      }
    }
  }

  private applyPowerup(player: Player, powerup: PowerupItem, now: number): void {
    if (powerup.type === 'shieldsplitter') {
      player.shieldSplitterUntil = now + 8000;
    } else if (powerup.type === 'lifecore') {
      // damageMitigation is a fraction [0, 1] that reduces incoming damage.
      // E.g. 0.3 = 30% reduction. Multiple pickups stack additively, capped at 1.0 (full immunity).
      player.damageMitigation = Math.min(1, (player.damageMitigation ?? 0) + 0.3);
    }
  }

  handleUseWeapon(match: Match, playerId: string, io: Server): Projectile | null {
    const player = match.players.find(p => p.id === playerId);
    if (!player || player.status !== 'alive' || !player.currentWeapon) return null;

    const now = Date.now();
    if (now < (player.weaponCooldownUntil ?? 0)) return null;

    const weapon = player.currentWeapon;

    if (weapon.category === 'thrown') {
      if (weapon.ammo <= 0) {
        player.currentWeapon = null;
        io.to(match.roomId).emit('item:drop', { itemId: weapon.id, despawned: true });
        return null;
      }

      const speed = weapon.type === 'lightningspear' ? LIGHTNINGSPEAR_SPEED : ICECRYSTAL_SPEED;
      const dir = player.facing === 'right' ? 1 : -1;

      const projectile: Projectile = {
        id: uuidv4(),
        type: weapon.type as 'lightningspear' | 'icecrystal',
        position: { x: player.position.x + 20, y: player.position.y + 20 },
        velocity: { x: dir * speed, y: 0 },
        thrownBy: playerId,
        damage: weapon.damage,
        knockbackModifier: weapon.knockbackModifier,
        active: true,
      };

      weapon.ammo--;
      player.weaponCooldownUntil = now + weapon.attackCooldown;
      match.projectiles.push(projectile);
      io.to(match.roomId).emit('item:use', { playerId, weaponType: weapon.type, projectileId: projectile.id });

      if (weapon.ammo <= 0) {
        player.currentWeapon = null;
        io.to(match.roomId).emit('item:drop', { itemId: weapon.id, despawned: true });
      }

      return projectile;
    }

    return null;
  }

  checkAutoPickup(match: Match, io: Server): void {
    for (const player of match.players) {
      if (player.status !== 'alive') continue;
      this.handlePickup(match, player.id, io);
    }
  }

  handleMeleeWeaponAttack(match: Match, playerId: string, io: Server): void {
    const player = match.players.find(p => p.id === playerId);
    if (!player || player.status !== 'alive' || !player.currentWeapon) return;

    const weapon = player.currentWeapon;
    if (weapon.category !== 'melee') return;

    const now = Date.now();
    if (now < (player.weaponCooldownUntil ?? 0)) return;

    weapon.durability--;
    player.weaponCooldownUntil = now + weapon.attackCooldown;
    io.to(match.roomId).emit('item:use', { playerId, weaponType: weapon.type });

    if (weapon.durability <= 0) {
      player.currentWeapon = null;
      io.to(match.roomId).emit('item:drop', { itemId: weapon.id, despawned: true });
    }
  }

  updateProjectiles(match: Match, io: Server, dt: number): void {
    const now = Date.now();
    for (let i = match.projectiles.length - 1; i >= 0; i--) {
      const proj = match.projectiles[i];
      if (!proj.active) { match.projectiles.splice(i, 1); continue; }

      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;

      // Gravity for ice crystal
      if (proj.type === 'icecrystal') {
        proj.velocity.y += 300 * dt;
      }

      // Check collision with players
      const thrower = match.players.find(p => p.id === proj.thrownBy);
      for (const target of match.players) {
        if (target.id === proj.thrownBy) continue;
        if (target.status !== 'alive') continue;
        if (target.invulnerableUntil > now) continue;

        const dx = proj.position.x - (target.position.x + 20);
        const dy = proj.position.y - (target.position.y + 30);
        if (Math.abs(dx) < 25 && Math.abs(dy) < 35) {
          // Hit!
          const baseDamage = proj.damage * (1 - (target.damageMitigation ?? 0));
          target.currentDamage += baseDamage;

          const magnitude = 200 * (1 + target.currentDamage / 100) * proj.knockbackModifier *
            (thrower && (thrower.shieldSplitterUntil ?? 0) > now ? 2 : 1);
          let kx = proj.velocity.x / (Math.abs(proj.velocity.x) || 1);
          let ky = -0.5;
          const klen = Math.sqrt(kx * kx + ky * ky);
          target.velocity.x += (kx / klen) * magnitude;
          target.velocity.y += (ky / klen) * magnitude;

          // Freeze effect from ice crystal
          if (proj.type === 'icecrystal') {
            target.freezeUntil = now + 2000;
          }

          io.to(match.roomId).emit('player:hit', {
            results: [{ targetId: target.id, damage: baseDamage, knockback: { x: (kx / klen) * magnitude, y: (ky / klen) * magnitude }, blocked: false }],
            type: proj.type,
            projectileId: proj.id,
          });

          proj.active = false;
          match.projectiles.splice(i, 1);
          break;
        }
      }

      if (!proj.active) continue;

      // Out of bounds check
      if (proj.position.x < -500 || proj.position.x > 1700 || proj.position.y > 1200) {
        proj.active = false;
        match.projectiles.splice(i, 1);
      }
    }
  }
}
