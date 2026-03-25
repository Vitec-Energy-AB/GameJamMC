export interface BotDifficultyConfig {
  /** How long (ms) before the bot makes a new decision */
  reactionTimeMs: number;
  /** 0–1 chance the bot lands its attack */
  attackAccuracy: number;
  /** 0–1 chance the bot successfully dodges an incoming threat */
  dodgeProbability: number;
  /** 0–1 chance the bot uses a bomb when it has one */
  bombUsageChance: number;
  /** 0–1 how aware the bot is of nearby items */
  itemPickupAwareness: number;
  /** 0–1 how strongly the bot avoids blast-zones / lava */
  edgeAvoidance: number;
  /** 0–1 chance the bot blocks an incoming attack */
  blockSkill: number;
  /** 0–1 how aggressively the bot pursues enemies */
  aggressionLevel: number;
  /** 0–1 random noise added to movement (higher = sloppier) */
  movementJitter: number;
}

export const BOT_DIFFICULTY_CONFIGS: Record<1 | 2 | 3 | 4 | 5, BotDifficultyConfig> = {
  1: {
    reactionTimeMs: 600,
    attackAccuracy: 0.3,
    dodgeProbability: 0.1,
    bombUsageChance: 0.05,
    itemPickupAwareness: 0.2,
    edgeAvoidance: 0.3,
    blockSkill: 0.05,
    aggressionLevel: 0.3,
    movementJitter: 0.4,
  },
  2: {
    reactionTimeMs: 400,
    attackAccuracy: 0.5,
    dodgeProbability: 0.25,
    bombUsageChance: 0.15,
    itemPickupAwareness: 0.4,
    edgeAvoidance: 0.5,
    blockSkill: 0.15,
    aggressionLevel: 0.4,
    movementJitter: 0.3,
  },
  3: {
    reactionTimeMs: 250,
    attackAccuracy: 0.7,
    dodgeProbability: 0.45,
    bombUsageChance: 0.3,
    itemPickupAwareness: 0.6,
    edgeAvoidance: 0.7,
    blockSkill: 0.35,
    aggressionLevel: 0.5,
    movementJitter: 0.15,
  },
  4: {
    reactionTimeMs: 120,
    attackAccuracy: 0.85,
    dodgeProbability: 0.7,
    bombUsageChance: 0.5,
    itemPickupAwareness: 0.8,
    edgeAvoidance: 0.85,
    blockSkill: 0.6,
    aggressionLevel: 0.7,
    movementJitter: 0.05,
  },
  5: {
    reactionTimeMs: 50,
    attackAccuracy: 0.95,
    dodgeProbability: 0.9,
    bombUsageChance: 0.7,
    itemPickupAwareness: 0.95,
    edgeAvoidance: 0.95,
    blockSkill: 0.85,
    aggressionLevel: 0.9,
    movementJitter: 0,
  },
};

export function getBotConfig(difficulty: 1 | 2 | 3 | 4 | 5): BotDifficultyConfig {
  return BOT_DIFFICULTY_CONFIGS[difficulty];
}
