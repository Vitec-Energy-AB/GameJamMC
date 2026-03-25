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
  /** 0–1 how well the bot navigates using platforms instead of running straight */
  platformNavigationSkill: number;
  /** 0–1 how aggressively the bot edge-guards near-eliminated enemies */
  edgeGuardSkill: number;
  /** 0–1 how well the bot follows up hits with combos / kill confirms */
  comboAwareness: number;
  /** 0–1 how well the bot maintains spacing after attacks */
  spacingSkill: number;
}

export const BOT_DIFFICULTY_CONFIGS: Record<1 | 2 | 3 | 4 | 5, BotDifficultyConfig> = {
  1: {
    reactionTimeMs: 500,
    attackAccuracy: 0.4,
    dodgeProbability: 0.1,
    bombUsageChance: 0.15,
    itemPickupAwareness: 0.2,
    edgeAvoidance: 0.3,
    blockSkill: 0.05,
    aggressionLevel: 0.5,
    movementJitter: 0.4,
    platformNavigationSkill: 0.1,
    edgeGuardSkill: 0.05,
    comboAwareness: 0.1,
    spacingSkill: 0.05,
  },
  2: {
    reactionTimeMs: 300,
    attackAccuracy: 0.6,
    dodgeProbability: 0.25,
    bombUsageChance: 0.25,
    itemPickupAwareness: 0.4,
    edgeAvoidance: 0.5,
    blockSkill: 0.15,
    aggressionLevel: 0.6,
    movementJitter: 0.3,
    platformNavigationSkill: 0.3,
    edgeGuardSkill: 0.2,
    comboAwareness: 0.25,
    spacingSkill: 0.2,
  },
  3: {
    reactionTimeMs: 180,
    attackAccuracy: 0.8,
    dodgeProbability: 0.45,
    bombUsageChance: 0.45,
    itemPickupAwareness: 0.6,
    edgeAvoidance: 0.7,
    blockSkill: 0.35,
    aggressionLevel: 0.75,
    movementJitter: 0.15,
    platformNavigationSkill: 0.55,
    edgeGuardSkill: 0.45,
    comboAwareness: 0.5,
    spacingSkill: 0.45,
  },
  4: {
    reactionTimeMs: 80,
    attackAccuracy: 0.85,
    dodgeProbability: 0.7,
    bombUsageChance: 0.6,
    itemPickupAwareness: 0.8,
    edgeAvoidance: 0.85,
    blockSkill: 0.6,
    aggressionLevel: 0.85,
    movementJitter: 0.05,
    platformNavigationSkill: 0.75,
    edgeGuardSkill: 0.7,
    comboAwareness: 0.75,
    spacingSkill: 0.7,
  },
  5: {
    reactionTimeMs: 30,
    attackAccuracy: 0.95,
    dodgeProbability: 0.9,
    bombUsageChance: 0.8,
    itemPickupAwareness: 0.95,
    edgeAvoidance: 0.95,
    blockSkill: 0.85,
    aggressionLevel: 0.95,
    movementJitter: 0,
    platformNavigationSkill: 0.95,
    edgeGuardSkill: 0.9,
    comboAwareness: 0.95,
    spacingSkill: 0.9,
  },
};

export function getBotConfig(difficulty: 1 | 2 | 3 | 4 | 5): BotDifficultyConfig {
  return BOT_DIFFICULTY_CONFIGS[difficulty];
}
