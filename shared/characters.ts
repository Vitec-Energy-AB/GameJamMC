export interface CharacterStats {
  id: string;
  name: string;
  /** Horizontal movement speed (px/s) */
  speed: number;
  /** Jump velocity (negative = upward) */
  jumpForce: number;
  /** Weight multiplier for incoming knockback */
  weight: number;
  /** Outgoing damage multiplier */
  dmgMod: number;
  /** Maximum number of jumps (including first jump) */
  maxJumps: number;
  /** Player colour */
  color: string;
  /** Short description shown in character select */
  description: string;
}

export const CHARACTERS: CharacterStats[] = [
  {
    id: 'bjork',
    name: 'Bjork',
    speed: 300,
    jumpForce: -620,
    weight: 1.0,
    dmgMod: 1.0,
    maxJumps: 2,
    color: '#4CAF50',
    description: 'Balanced all-rounder',
  },
  {
    id: 'gnista',
    name: 'Gnista',
    speed: 400,
    jumpForce: -600,
    weight: 0.7,
    dmgMod: 0.85,
    maxJumps: 2,
    color: '#FF9800',
    description: 'Fast & light, gets sent far',
  },
  {
    id: 'malm',
    name: 'Malm',
    speed: 220,
    jumpForce: -560,
    weight: 1.5,
    dmgMod: 1.3,
    maxJumps: 2,
    color: '#795548',
    description: 'Heavy hitter, hard to move',
  },
  {
    id: 'dimma',
    name: 'Dimma',
    speed: 280,
    jumpForce: -720,
    weight: 0.85,
    dmgMod: 0.95,
    maxJumps: 3,
    color: '#9C27B0',
    description: 'Triple-jump acrobat',
  },
];

export function getCharacter(id?: string): CharacterStats | undefined {
  if (!id) return undefined;
  return CHARACTERS.find(c => c.id === id);
}
