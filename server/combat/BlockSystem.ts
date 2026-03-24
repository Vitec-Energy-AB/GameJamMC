import { Player } from '../../shared/types';

const BLOCK_DURATION = 2000; // ms
const BLOCK_COOLDOWN = 3000; // ms

export function startBlock(player: Player): void {
  if ((player.blockCooldown ?? 0) > Date.now()) return;
  player.isBlocking = true;
  player.blockDuration = Date.now() + BLOCK_DURATION;
}

export function stopBlock(player: Player): void {
  if (!player.isBlocking) return;
  player.isBlocking = false;
  player.blockCooldown = Date.now() + BLOCK_COOLDOWN;
}

export function updateBlock(player: Player, _dt: number): void {
  if (player.isBlocking && player.blockDuration !== undefined && Date.now() > player.blockDuration) {
    stopBlock(player);
  }
}
