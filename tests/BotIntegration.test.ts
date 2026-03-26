import { BotManager } from '../server/bots/BotManager';
import { MatchManager } from '../server/MatchManager';
import { Match, Player } from '../shared/types';

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    roomId: 'integration-room',
    state: 'active',
    players: [],
    queue: [],
    map: {
      name: 'Test',
      platforms: [{ x: 0, y: 400, width: 1200, height: 40, type: 'solid' }],
      spawnPoints: [
        { x: 200, y: 300 },
        { x: 400, y: 300 },
        { x: 600, y: 300 },
        { x: 800, y: 300 },
      ],
      itemSpawnPoints: [{ x: 400, y: 200 }],
      blastZones: { top: -200, bottom: 900, left: -1000, right: 2300 },
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
    ...overrides,
  };
}

describe('Bot Integration – respects maxPlayers', () => {
  test('cannot add more bots than maxPlayers allows', () => {
    const mgr = new BotManager();
    const match = makeMatch({ maxPlayers: 3 });

    // Add a human
    match.players.push({ id: 'human-1', isBot: false } as Player);

    // Should be able to add 2 more bots (total 3)
    const b1 = mgr.addBot(match, 2);
    const b2 = mgr.addBot(match, 3);
    const b3 = mgr.addBot(match, 4); // should fail – full

    expect(b1).not.toBeNull();
    expect(b2).not.toBeNull();
    expect(b3).toBeNull();
    expect(match.players).toHaveLength(3);
  });
});

describe('Bot Integration – win condition', () => {
  test('bot can win a match (MatchManager.checkWinCondition)', () => {
    const matchManager = new MatchManager();
    const match = makeMatch();

    // Add two players: one bot alive, one human eliminated
    const botPlayer: Player = {
      id: 'bot-abc',
      name: 'Bot-Varg',
      isBot: true,
      botDifficulty: 3,
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      facing: 'right',
      currentDamage: 0,
      currentLives: 2,
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
      currentWeapon: null,
      weaponCooldownUntil: 0,
      bombCooldownUntil: 0,
      freezeUntil: 0,
      shieldSplitterUntil: 0,
      damageMitigation: 0,
      forceFieldUntil: 0,
    };

    const humanPlayer: Player = {
      ...botPlayer,
      id: 'human-1',
      name: 'Human',
      isBot: false,
      status: 'eliminated',
    };

    match.players.push(botPlayer, humanPlayer);

    const winnerId = matchManager.checkWinCondition(match);
    expect(winnerId).toBe('bot-abc');
  });

  test('MatchManager.endMatch skips leaderboard for bot winners', () => {
    let leaderboardCalled = false;
    const fakeLeaderboardService = {
      submitScore: () => {
        leaderboardCalled = true;
        return { entry: {} as any, alreadySubmitted: false };
      },
      getTop: () => [],
    };

    const matchManager = new MatchManager(fakeLeaderboardService as any);
    const match = makeMatch();
    match.runId = 'run-test-123';
    match.state = 'active';

    const botWinner: Player = {
      id: 'bot-xyz',
      name: 'Bot-Eld',
      isBot: true,
      botDifficulty: 3,
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      facing: 'right',
      currentDamage: 0,
      currentLives: 2,
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
      currentWeapon: null,
      weaponCooldownUntil: 0,
      bombCooldownUntil: 0,
      freezeUntil: 0,
      shieldSplitterUntil: 0,
      damageMitigation: 0,
      forceFieldUntil: 0,
    };

    match.players.push(botWinner);

    const fakeIo = {
      to: () => ({ emit: () => {} }),
    } as any;

    matchManager.endMatch('integration-room', 'bot-xyz', match, fakeIo);
    expect(leaderboardCalled).toBe(false);
  });
});

describe('Bot Integration – updateBots runs without error', () => {
  test('updateBots processes multiple bots in an active match', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    mgr.addBot(match, 1);
    mgr.addBot(match, 3);
    mgr.addBot(match, 5);
    match.players.forEach(p => { p.status = 'alive'; });
    expect(() => mgr.updateBots(match, Date.now())).not.toThrow();
  });
});
