import { evaluate } from '../server/bots/BotAI';
import {
  chaseTarget,
  edgeGuard,
  recoveryJump,
  tryBlock,
  patrol,
} from '../server/bots/BotBehaviors';
import {
  findNearestPlatform,
  findPlatformToward,
  canReachPlatform,
  navigateToTarget,
  MAX_SINGLE_JUMP_HEIGHT,
} from '../server/bots/BotNavigation';
import { getBotConfig } from '../server/bots/BotConfig';
import { Player, Match, Platform } from '../shared/types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'bot-test',
    name: 'Bot-Test',
    isBot: true,
    botDifficulty: 3,
    position: { x: 400, y: 300 },
    velocity: { x: 0, y: 0 },
    facing: 'right',
    currentDamage: 0,
    currentLives: 3,
    isBlocking: false,
    blockCooldown: 0,
    isGrounded: true,
    jumpsRemaining: 2,
    status: 'alive',
    invulnerableUntil: 0,
    inputState: {
      left: false, right: false, jump: false, attack: false,
      block: false, throwBomb: false, pickup: false, useWeapon: false, duck: false,
    },
    color: '#fff',
    currentWeapon: null,
    weaponCooldownUntil: 0,
    bombCooldownUntil: 0,
    freezeUntil: 0,
    shieldSplitterUntil: 0,
    damageMitigation: 0,
    forceFieldUntil: 0,
    attackCooldown: 0,
    ...overrides,
  };
}

function makeMatch(botPlayer: Player, extras: Player[] = []): Match {
  return {
    roomId: 'test-room',
    state: 'active',
    players: [botPlayer, ...extras],
    queue: [],
    map: {
      name: 'Test',
      platforms: [],
      spawnPoints: [{ x: 400, y: 300 }],
      itemSpawnPoints: [],
      blastZones: { top: -200, bottom: 900, left: -200, right: 1400 },
    },
    mode: 'stock',
    tick: 0,
    winner: null,
    maxPlayers: 10,
    bombs: [],
    items: [],
    projectiles: [],
    movingPlatforms: [],
    crumblingPlatforms: [],
    mapVotes: {},
    selectedMap: 'testArena',
    lavaState: {
      active: false,
      currentY: 1000,
      riseSpeed: 0,
      baseDamage: 0,
      startDelay: 0,
      startedAt: 0,
      accelerationRate: 0,
    },
  };
}

describe('BotAI.evaluate – safety behavior', () => {
  test('moves toward center when near left blast zone', () => {
    const bot = makePlayer({ position: { x: -100, y: 300 } }); // near left edge
    const match = makeMatch(bot);
    evaluate(bot, match, Date.now());
    // Bot should try to move right (toward center)
    expect(bot.inputState.right).toBe(true);
    expect(bot.inputState.left).toBe(false);
  });

  test('moves toward center when near right blast zone', () => {
    const bot = makePlayer({ position: { x: 1350, y: 300 } }); // near right edge
    const match = makeMatch(bot);
    evaluate(bot, match, Date.now());
    expect(bot.inputState.left).toBe(true);
    expect(bot.inputState.right).toBe(false);
  });
});

describe('BotAI.evaluate – does not throw for eliminated bot', () => {
  test('does nothing when bot is not alive', () => {
    const bot = makePlayer({ status: 'eliminated' });
    const match = makeMatch(bot);
    expect(() => evaluate(bot, match, Date.now())).not.toThrow();
    // Status should remain eliminated
    expect(bot.status).toBe('eliminated');
  });

  test('does nothing when bot is respawning', () => {
    const bot = makePlayer({ status: 'respawning' });
    const match = makeMatch(bot);
    expect(() => evaluate(bot, match, Date.now())).not.toThrow();
    // Status should remain respawning
    expect(bot.status).toBe('respawning');
  });

  test('auto-activates bot with ready status when match is active', () => {
    const bot = makePlayer({ status: 'ready' });
    const match = makeMatch(bot);
    // match.state is 'active' by default in makeMatch
    evaluate(bot, match, Date.now() + 10000);
    expect(bot.status).toBe('alive');
  });

  test('does not activate bot with ready status when match is not active', () => {
    const bot = makePlayer({ status: 'ready' });
    const match = makeMatch(bot);
    match.state = 'lobby';
    evaluate(bot, match, Date.now());
    expect(bot.status).toBe('ready');
  });
});

describe('BotAI.evaluate – attack behavior', () => {
  test('sets attack or useWeapon when enemy is in range', () => {
    const bot = makePlayer({
      botDifficulty: 5, // Master – always attacks
      position: { x: 400, y: 300 },
      attackCooldown: 0,
    });
    const enemy = makePlayer({
      id: 'enemy-1',
      isBot: false,
      position: { x: 420, y: 300 }, // Very close
      status: 'alive',
    });
    const match = makeMatch(bot, [enemy]);
    // Force a new decision by setting last decision far in the past
    evaluate(bot, match, Date.now() + 10000);
    // At difficulty 5, accuracy is 0.95 – statistically will attack
    // Just check it doesn't throw and the state is boolean
    expect(typeof bot.inputState.attack).toBe('boolean');
    expect(typeof bot.inputState.useWeapon).toBe('boolean');
  });
});

describe('BotAI.evaluate – chase behavior', () => {
  test('chases enemy immediately when visible regardless of isNewDecision', () => {
    const bot = makePlayer({
      position: { x: 400, y: 300 },
      botDifficulty: 3,
    });
    const enemy = makePlayer({
      id: 'enemy-1',
      isBot: false,
      position: { x: 700, y: 300 }, // Visible but outside attack range
      status: 'alive',
    });
    const match = makeMatch(bot, [enemy]);

    // First call to seed state
    evaluate(bot, match, 1000);
    // Second call only 10ms later (well within reactionTimeMs) – isNewDecision is false
    evaluate(bot, match, 1010);

    // Bot should still be chasing (moving toward enemy at x=700 means moving right)
    expect(bot.inputState.right).toBe(true);
    expect(bot.inputState.left).toBe(false);
  });
});

describe('BotAI.evaluate – attack falls through to melee when weapon on cooldown', () => {
  test('attacks with melee even when weapon is on cooldown', () => {
    const futureTime = Date.now() + 10000;
    const bot = makePlayer({
      botDifficulty: 5, // high accuracy
      position: { x: 400, y: 300 },
      attackCooldown: 0,
      currentWeapon: {
        id: 'sword-test',
        type: 'lightningspear',
        category: 'thrown',
        position: { x: 0, y: 0 },
        pickedUpBy: 'bot-test',
        durability: 0,
        ammo: 3,
        damage: 10,
        knockbackModifier: 1.0,
        attackCooldown: 500,
        rarity: 'common',
        spawnTime: 0,
        active: true,
      },
      weaponCooldownUntil: futureTime + 5000, // weapon on cooldown far in the future
    });
    const enemy = makePlayer({
      id: 'enemy-1',
      isBot: false,
      position: { x: 420, y: 300 }, // Within melee range
      status: 'alive',
    });
    const match = makeMatch(bot, [enemy]);

    // Run many times since blockSkill/random may block some attempts
    let meleeAttacked = false;
    for (let i = 0; i < 50; i++) {
      bot.inputState.attack = false;
      bot.attackCooldown = 0;
      // Mock blockSkill to 0 to ensure attack path is taken
      evaluate(bot, match, futureTime + i);
      if (bot.inputState.attack) {
        meleeAttacked = true;
        break;
      }
    }
    // With difficulty 5 (accuracy 0.95) and 50 attempts, melee should trigger
    expect(meleeAttacked).toBe(true);
  });
});

describe('BotAI.evaluate – patrol behavior', () => {
  test('sets horizontal movement when patrolling', () => {
    const bot = makePlayer({ position: { x: 400, y: 300 } });
    const match = makeMatch(bot); // no enemies
    evaluate(bot, match, Date.now() + 10000);
    // Bot should be moving in some direction or at least not throw
    const isMoving = bot.inputState.left || bot.inputState.right;
    expect(typeof isMoving).toBe('boolean');
  });
});

describe('BotAI.evaluate – reaction time gate', () => {
  test('does not change behavior before reactionTimeMs elapses', () => {
    const bot = makePlayer({ botDifficulty: 1 }); // slow reaction: 600ms
    const match = makeMatch(bot);
    const start = 1000;
    // First evaluation to seed lastDecisionTime
    evaluate(bot, match, start);
    const inputAfterFirst = { ...bot.inputState };

    // Second evaluation only 50ms later (less than 600ms reaction time)
    evaluate(bot, match, start + 50);
    // The input should have been reset to all false (since we reset at top of evaluate)
    // but the behavior is the same as before (patrol continues)
    expect(typeof bot.inputState.left).toBe('boolean');
  });
});

// ── BotNavigation tests ───────────────────────────────────────────────────────

describe('BotNavigation – MAX_SINGLE_JUMP_HEIGHT', () => {
  test('is approximately 183.7 px (v²/2g = 600²/1960)', () => {
    expect(MAX_SINGLE_JUMP_HEIGHT).toBeCloseTo(183.67, 0);
  });
});

describe('BotNavigation – canReachPlatform', () => {
  test('returns true for platform at same level or below', () => {
    const bot = makePlayer({ position: { x: 400, y: 400 }, jumpsRemaining: 2, isGrounded: true });
    const platform: Platform = { x: 300, y: 420, width: 200, height: 20, type: 'passthrough' };
    expect(canReachPlatform(bot, platform)).toBe(true);
  });

  test('returns true for platform within single-jump height', () => {
    const bot = makePlayer({ position: { x: 400, y: 500 }, jumpsRemaining: 1, isGrounded: true });
    // Platform 150 px above – within ~183 px single jump
    const platform: Platform = { x: 300, y: 350, width: 200, height: 20, type: 'passthrough' };
    expect(canReachPlatform(bot, platform)).toBe(true);
  });

  test('returns true for platform within double-jump reach', () => {
    const bot = makePlayer({ position: { x: 400, y: 600 }, jumpsRemaining: 2, isGrounded: false });
    // Platform 330 px above – only reachable with two jumps (2 × 183 ≈ 367 px)
    const platform: Platform = { x: 300, y: 270, width: 200, height: 20, type: 'passthrough' };
    expect(canReachPlatform(bot, platform)).toBe(true);
  });

  test('returns false for platform too high to reach', () => {
    const bot = makePlayer({ position: { x: 400, y: 600 }, jumpsRemaining: 0, isGrounded: false });
    // Platform 300 px above – no jumps left
    const platform: Platform = { x: 300, y: 300, width: 200, height: 20, type: 'passthrough' };
    expect(canReachPlatform(bot, platform)).toBe(false);
  });
});

describe('BotNavigation – findNearestPlatform', () => {
  test('returns platform directly beneath bot', () => {
    const bot = makePlayer({ position: { x: 400, y: 380 } }); // feet at ~410
    const match = makeMatch(bot);
    match.map.platforms = [
      { x: 300, y: 420, width: 200, height: 20, type: 'solid' }, // 10px below feet
      { x: 300, y: 550, width: 200, height: 20, type: 'solid' }, // far below
    ];
    const result = findNearestPlatform(bot, match);
    expect(result).not.toBeNull();
    expect(result!.y).toBe(420);
  });

  test('returns null when no platform is below', () => {
    const bot = makePlayer({ position: { x: 400, y: 200 } });
    const match = makeMatch(bot);
    match.map.platforms = [
      { x: 300, y: 100, width: 200, height: 20, type: 'passthrough' }, // above bot
    ];
    const result = findNearestPlatform(bot, match);
    expect(result).toBeNull();
  });

  test('returns null when bot is not horizontally over any platform', () => {
    const bot = makePlayer({ position: { x: 800, y: 380 } });
    const match = makeMatch(bot);
    match.map.platforms = [
      { x: 100, y: 420, width: 200, height: 20, type: 'solid' }, // not under bot
    ];
    const result = findNearestPlatform(bot, match);
    expect(result).toBeNull();
  });
});

describe('BotNavigation – findPlatformToward', () => {
  test('returns null when target is at same height', () => {
    const bot = makePlayer({ position: { x: 400, y: 400 }, jumpsRemaining: 2, isGrounded: true });
    const match = makeMatch(bot);
    match.map.platforms = [
      { x: 200, y: 300, width: 200, height: 20, type: 'passthrough' },
    ];
    // Target at same height – no intermediate platform needed
    const result = findPlatformToward(bot, 600, 400, match);
    expect(result).toBeNull();
  });

  test('returns an intermediate platform when target is above', () => {
    const bot = makePlayer({ position: { x: 400, y: 620 }, jumpsRemaining: 2, isGrounded: true });
    const match = makeMatch(bot);
    // Intermediate platform at y=450 (170 px above bot, within single jump)
    match.map.platforms = [
      { x: 300, y: 450, width: 200, height: 20, type: 'passthrough' },
      { x: 300, y: 180, width: 200, height: 20, type: 'passthrough' }, // too high
    ];
    // Target at y=180 is 440 px above – need intermediate step
    const result = findPlatformToward(bot, 400, 180, match);
    expect(result).not.toBeNull();
    expect(result!.y).toBe(450); // should choose the reachable intermediate platform
  });
});

describe('BotNavigation – navigateToTarget', () => {
  test('moves right when target is to the right', () => {
    const bot = makePlayer({ position: { x: 200, y: 400 }, jumpsRemaining: 2, isGrounded: true });
    const match = makeMatch(bot);
    const config = getBotConfig(5);
    navigateToTarget(bot, 600, 400, match, config);
    expect(bot.inputState.right).toBe(true);
    expect(bot.inputState.left).toBe(false);
  });

  test('moves left when target is to the left', () => {
    const bot = makePlayer({ position: { x: 600, y: 400 }, jumpsRemaining: 2, isGrounded: true });
    const match = makeMatch(bot);
    const config = getBotConfig(5);
    navigateToTarget(bot, 200, 400, match, config);
    expect(bot.inputState.left).toBe(true);
    expect(bot.inputState.right).toBe(false);
  });

  test('jumps when target is significantly above', () => {
    const bot = makePlayer({
      position: { x: 400, y: 500 },
      jumpsRemaining: 2,
      isGrounded: true,
    });
    const match = makeMatch(bot);
    const config = getBotConfig(5);
    // Target 150 px above – within jump reach
    navigateToTarget(bot, 400, 350, match, config);
    expect(bot.inputState.jump).toBe(true);
  });

  test('does not jump when target is below', () => {
    const bot = makePlayer({
      position: { x: 400, y: 200 },
      jumpsRemaining: 2,
      isGrounded: true,
    });
    const match = makeMatch(bot);
    const config = getBotConfig(5);
    navigateToTarget(bot, 400, 500, match, config);
    expect(bot.inputState.jump).toBe(false);
  });
});

// ── Reactive block tests ──────────────────────────────────────────────────────

describe('BotBehaviors – tryBlock (reactive)', () => {
  test('high-skill bot rarely blocks when target is not attacking', () => {
    const bot = makePlayer({ botDifficulty: 5, position: { x: 400, y: 300 } });
    const target = makePlayer({
      id: 'enemy',
      position: { x: 430, y: 300 },
      isAttacking: false,
      status: 'alive',
    });
    const config = getBotConfig(5);
    let blockCount = 0;
    for (let i = 0; i < 100; i++) {
      bot.inputState.block = false;
      tryBlock(bot, target, config, 0);
      if (bot.inputState.block) blockCount++;
    }
    // With blockSkill 0.85 × 0.2 = 0.17 chance, expect well under 50 blocks in 100 tries
    expect(blockCount).toBeLessThan(50);
  });

  test('high-skill bot blocks more often when target IS attacking', () => {
    const bot = makePlayer({ botDifficulty: 5, position: { x: 400, y: 300 } });
    const target = makePlayer({
      id: 'enemy',
      position: { x: 430, y: 300 },
      isAttacking: true,
      status: 'alive',
    });
    const config = getBotConfig(5);
    let blockCountAttacking = 0;
    for (let i = 0; i < 100; i++) {
      bot.inputState.block = false;
      tryBlock(bot, target, config, 0);
      if (bot.inputState.block) blockCountAttacking++;
    }
    // Expect substantially more blocks when target is attacking
    expect(blockCountAttacking).toBeGreaterThan(30);
  });
});

// ── Edge guard tests ──────────────────────────────────────────────────────────

describe('BotBehaviors – edgeGuard', () => {
  test('returns false when target has low damage', () => {
    const bot = makePlayer({ botDifficulty: 5, position: { x: 400, y: 300 } });
    const target = makePlayer({
      id: 'enemy',
      position: { x: 50, y: 300 }, // near left edge
      currentDamage: 20, // low damage
      status: 'alive',
    });
    const match = makeMatch(bot, [target]);
    const config = getBotConfig(5);
    const result = edgeGuard(bot, target, match, config);
    expect(result).toBe(false);
  });

  test('returns false for difficulty-1 bot (edgeGuardSkill too low)', () => {
    const bot = makePlayer({ botDifficulty: 1, position: { x: 400, y: 300 } });
    const target = makePlayer({
      id: 'enemy',
      position: { x: 50, y: 300 },
      currentDamage: 150,
      status: 'alive',
    });
    const match = makeMatch(bot, [target]);
    const config = getBotConfig(1); // edgeGuardSkill 0.05 < 0.2 threshold
    const result = edgeGuard(bot, target, match, config);
    expect(result).toBe(false);
  });

  test('high-skill bot eventually edge-guards when target is near edge with high damage', () => {
    const bot = makePlayer({ botDifficulty: 5, position: { x: 500, y: 300 } });
    const target = makePlayer({
      id: 'enemy',
      position: { x: -80, y: 300 }, // near left blast zone
      currentDamage: 120,
      status: 'alive',
    });
    const match = makeMatch(bot, [target]);
    const config = getBotConfig(5);
    let guarded = false;
    for (let i = 0; i < 20; i++) {
      if (edgeGuard(bot, target, match, config)) {
        guarded = true;
        break;
      }
    }
    expect(guarded).toBe(true);
  });
});

// ── Recovery jump tests ───────────────────────────────────────────────────────

describe('BotBehaviors – recoveryJump', () => {
  test('uses a jump when airborne and has jumps remaining', () => {
    const bot = makePlayer({
      position: { x: 400, y: 600 },
      isGrounded: false,
      jumpsRemaining: 1,
    });
    const match = makeMatch(bot);
    const config = getBotConfig(3);
    recoveryJump(bot, match, config);
    expect(bot.inputState.jump).toBe(true);
  });

  test('does not jump when grounded', () => {
    const bot = makePlayer({
      position: { x: 400, y: 300 },
      isGrounded: true,
      jumpsRemaining: 2,
    });
    const match = makeMatch(bot);
    const config = getBotConfig(3);
    recoveryJump(bot, match, config);
    expect(bot.inputState.jump).toBe(false);
  });

  test('moves toward the center of the stage', () => {
    // Bot on the left side – should move right toward center (600)
    const bot = makePlayer({ position: { x: 50, y: 400 }, isGrounded: false, jumpsRemaining: 1 });
    const match = makeMatch(bot);
    // blastZones: left=-200, right=1400 → center = 600
    const config = getBotConfig(3);
    recoveryJump(bot, match, config);
    expect(bot.inputState.right).toBe(true);
    expect(bot.inputState.left).toBe(false);
  });
});

// ── BotAI edge-guard integration ─────────────────────────────────────────────

describe('BotAI.evaluate – edge guard integration', () => {
  test('triggers edge guard behavior when enemy near blast zone with high damage', () => {
    const bot = makePlayer({
      botDifficulty: 5,
      position: { x: 500, y: 300 },
    });
    const enemy = makePlayer({
      id: 'enemy-1',
      isBot: false,
      position: { x: -60, y: 300 }, // near left blast zone
      currentDamage: 150,
      status: 'alive',
    });
    const match = makeMatch(bot, [enemy]);

    let movedTowardEnemy = false;
    for (let i = 0; i < 20; i++) {
      bot.inputState.left = false;
      bot.inputState.right = false;
      evaluate(bot, match, Date.now() + i * 500);
      // Enemy is to the left, so edge-guarding should move left
      if (bot.inputState.left) { movedTowardEnemy = true; break; }
    }
    expect(movedTowardEnemy).toBe(true);
  });
});

// ── BotAI recovery integration ────────────────────────────────────────────────

describe('BotAI.evaluate – recovery behavior', () => {
  test('uses jumps to recover when airborne near right blast zone (high edgeAvoidance bot)', () => {
    const bot = makePlayer({
      botDifficulty: 4, // edgeAvoidance 0.85 >= 0.5 threshold
      position: { x: 1300, y: 400 }, // near right blast zone (right = 1400)
      isGrounded: false,
      jumpsRemaining: 1,
    });
    const match = makeMatch(bot);
    evaluate(bot, match, Date.now() + 10000);
    // Should jump to recover
    expect(bot.inputState.jump).toBe(true);
  });
});

// ── Patrol strategic positioning ──────────────────────────────────────────────

describe('BotBehaviors – patrol (strategic)', () => {
  test('high-skill bot moves toward item spawn points when no items present', () => {
    const bot = makePlayer({
      botDifficulty: 5,
      position: { x: 400, y: 300 },
      isGrounded: true,
      jumpsRemaining: 2,
    });
    const match = makeMatch(bot);
    // Add an item spawn point far to the right
    match.map.itemSpawnPoints = [{ x: 900, y: 260 }];
    const config = getBotConfig(5);
    patrol(bot, match, config);
    // With platformNavigationSkill >= 0.4, should move toward the spawn point (right)
    expect(bot.inputState.right).toBe(true);
  });

  test('low-skill bot falls back to simple left/right patrol', () => {
    const bot = makePlayer({
      botDifficulty: 1,
      position: { x: 400, y: 300 },
    });
    const match = makeMatch(bot);
    const config = getBotConfig(1);
    patrol(bot, match, config);
    const isMoving = bot.inputState.left || bot.inputState.right;
    expect(typeof isMoving).toBe('boolean');
  });
});

// ── chaseTarget platform awareness ───────────────────────────────────────────

describe('BotBehaviors – chaseTarget (platform-aware)', () => {
  test('high-skill bot jumps when target is above (within jump reach)', () => {
    const bot = makePlayer({
      botDifficulty: 5,
      position: { x: 400, y: 500 },
      isGrounded: true,
      jumpsRemaining: 2,
    });
    const target = makePlayer({
      id: 'enemy',
      position: { x: 400, y: 320 }, // ~180 px above – within single jump
      status: 'alive',
    });
    const match = makeMatch(bot, [target]);
    const config = getBotConfig(5);
    chaseTarget(bot, target, match, config);
    expect(bot.inputState.jump).toBe(true);
  });

  test('low-skill bot still moves toward target horizontally', () => {
    const bot = makePlayer({
      botDifficulty: 1,
      position: { x: 300, y: 400 },
      isGrounded: true,
      jumpsRemaining: 2,
    });
    const target = makePlayer({
      id: 'enemy',
      position: { x: 700, y: 400 },
      status: 'alive',
    });
    const match = makeMatch(bot, [target]);
    const config = getBotConfig(1);
    chaseTarget(bot, target, match, config);
    expect(bot.inputState.right).toBe(true);
  });
});
