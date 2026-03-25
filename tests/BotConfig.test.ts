import { BOT_DIFFICULTY_CONFIGS, getBotConfig, BotDifficultyConfig } from '../server/bots/BotConfig';

describe('BotConfig – difficulty configurations', () => {
  const levels = [1, 2, 3, 4, 5] as const;

  test.each(levels)('level %i exists and has all required fields', (level) => {
    const cfg = getBotConfig(level);
    expect(cfg).toBeDefined();

    const requiredFields: (keyof BotDifficultyConfig)[] = [
      'reactionTimeMs',
      'attackAccuracy',
      'dodgeProbability',
      'bombUsageChance',
      'itemPickupAwareness',
      'edgeAvoidance',
      'blockSkill',
      'aggressionLevel',
      'movementJitter',
    ];

    for (const field of requiredFields) {
      expect(typeof cfg[field]).toBe('number');
    }
  });

  test.each(levels)('level %i probability values are in [0, 1]', (level) => {
    const cfg = getBotConfig(level);
    expect(cfg.attackAccuracy).toBeGreaterThanOrEqual(0);
    expect(cfg.attackAccuracy).toBeLessThanOrEqual(1);
    expect(cfg.dodgeProbability).toBeGreaterThanOrEqual(0);
    expect(cfg.dodgeProbability).toBeLessThanOrEqual(1);
    expect(cfg.bombUsageChance).toBeGreaterThanOrEqual(0);
    expect(cfg.bombUsageChance).toBeLessThanOrEqual(1);
    expect(cfg.itemPickupAwareness).toBeGreaterThanOrEqual(0);
    expect(cfg.itemPickupAwareness).toBeLessThanOrEqual(1);
    expect(cfg.edgeAvoidance).toBeGreaterThanOrEqual(0);
    expect(cfg.edgeAvoidance).toBeLessThanOrEqual(1);
    expect(cfg.blockSkill).toBeGreaterThanOrEqual(0);
    expect(cfg.blockSkill).toBeLessThanOrEqual(1);
    expect(cfg.aggressionLevel).toBeGreaterThanOrEqual(0);
    expect(cfg.aggressionLevel).toBeLessThanOrEqual(1);
    expect(cfg.movementJitter).toBeGreaterThanOrEqual(0);
    expect(cfg.movementJitter).toBeLessThanOrEqual(1);
  });

  test.each(levels)('level %i reactionTimeMs is positive', (level) => {
    const cfg = getBotConfig(level);
    expect(cfg.reactionTimeMs).toBeGreaterThan(0);
  });

  test('higher difficulty has faster reaction time', () => {
    for (let i = 1; i < 5; i++) {
      const lower = getBotConfig(i as 1 | 2 | 3 | 4 | 5);
      const higher = getBotConfig((i + 1) as 1 | 2 | 3 | 4 | 5);
      expect(lower.reactionTimeMs).toBeGreaterThan(higher.reactionTimeMs);
    }
  });

  test('higher difficulty has higher attack accuracy', () => {
    for (let i = 1; i < 5; i++) {
      const lower = getBotConfig(i as 1 | 2 | 3 | 4 | 5);
      const higher = getBotConfig((i + 1) as 1 | 2 | 3 | 4 | 5);
      expect(lower.attackAccuracy).toBeLessThan(higher.attackAccuracy);
    }
  });

  test('higher difficulty has lower movementJitter', () => {
    for (let i = 1; i < 5; i++) {
      const lower = getBotConfig(i as 1 | 2 | 3 | 4 | 5);
      const higher = getBotConfig((i + 1) as 1 | 2 | 3 | 4 | 5);
      expect(lower.movementJitter).toBeGreaterThanOrEqual(higher.movementJitter);
    }
  });

  test('all 5 configs are in BOT_DIFFICULTY_CONFIGS', () => {
    expect(Object.keys(BOT_DIFFICULTY_CONFIGS)).toHaveLength(5);
    for (const level of levels) {
      expect(BOT_DIFFICULTY_CONFIGS[level]).toBeDefined();
    }
  });
});
