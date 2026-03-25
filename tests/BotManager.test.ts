import { BotManager } from '../server/bots/BotManager';
import { Match, Player } from '../shared/types';
import { CHARACTERS } from '../shared/characters';

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    roomId: 'test-room',
    state: 'lobby',
    players: [],
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
      currentY: 900,
      riseSpeed: 0,
      baseDamage: 0,
      startDelay: 0,
      startedAt: 0,
      accelerationRate: 0,
    },
    ...overrides,
  };
}

describe('BotManager.addBot', () => {
  test('adds a bot to match.players', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 3);
    expect(bot).not.toBeNull();
    expect(match.players).toHaveLength(1);
    expect(match.players[0].isBot).toBe(true);
  });

  test('bot has correct difficulty', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 4);
    expect(bot?.botDifficulty).toBe(4);
  });

  test('bot id starts with "bot-"', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 1);
    expect(bot?.id).toMatch(/^bot-/);
  });

  test('bot name starts with "Bot-"', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 2);
    expect(bot?.name).toMatch(/^Bot-/);
  });

  test('bot status is "ready"', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 3);
    expect(bot?.status).toBe('ready');
  });

  test('returns null when match is full', () => {
    const mgr = new BotManager();
    const match = makeMatch({ maxPlayers: 2 });
    // Fill with 2 dummy players
    match.players.push({ id: 'p1' } as Player, { id: 'p2' } as Player);
    const bot = mgr.addBot(match, 3);
    expect(bot).toBeNull();
    expect(match.players).toHaveLength(2);
  });

  test('uses provided characterId when valid', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 3, 'malm');
    expect(bot?.character).toBe('malm');
  });

  test('assigns a random character when invalid characterId provided', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 3, 'not-a-real-character');
    expect(CHARACTERS.map(c => c.id)).toContain(bot?.character);
  });

  test('multiple bots get unique ids', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    mgr.addBot(match, 1);
    mgr.addBot(match, 2);
    mgr.addBot(match, 3);
    const ids = match.players.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('BotManager.removeBot', () => {
  test('removes bot by id', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const bot = mgr.addBot(match, 3)!;
    mgr.removeBot(match, bot.id);
    expect(match.players).toHaveLength(0);
  });

  test('does nothing for unknown id', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    mgr.addBot(match, 3);
    mgr.removeBot(match, 'does-not-exist');
    expect(match.players).toHaveLength(1);
  });

  test('does not remove human players', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    const humanId = 'human-1';
    match.players.push({ id: humanId, isBot: false } as Player);
    mgr.removeBot(match, humanId);
    expect(match.players).toHaveLength(1);
  });
});

describe('BotManager.removeAllBots', () => {
  test('removes all bots but keeps humans', () => {
    const mgr = new BotManager();
    const match = makeMatch();
    match.players.push({ id: 'human-1', isBot: false } as Player);
    mgr.addBot(match, 2);
    mgr.addBot(match, 4);
    mgr.removeAllBots(match);
    expect(match.players).toHaveLength(1);
    expect(match.players[0].id).toBe('human-1');
  });
});

describe('BotManager.updateBots', () => {
  test('does not throw when called with no bots', () => {
    const mgr = new BotManager();
    const match = makeMatch({ state: 'active' });
    expect(() => mgr.updateBots(match, Date.now())).not.toThrow();
  });

  test('sets bot inputState without throwing', () => {
    const mgr = new BotManager();
    const match = makeMatch({ state: 'active' });
    const bot = mgr.addBot(match, 3)!;
    bot.status = 'alive';
    expect(() => mgr.updateBots(match, Date.now())).not.toThrow();
    expect(bot.inputState).toBeDefined();
  });
});
