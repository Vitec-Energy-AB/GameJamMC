import { v4 as uuidv4 } from 'uuid';
import { Match, Player } from '../../shared/types';
import { CHARACTERS, getCharacter } from '../../shared/characters';
import { getBotName, BOT_NAME_POOL } from './BotNames';
import { evaluate, clearBotState } from './BotAI';

export class BotManager {
  /** Running counter used to cycle through bot names. */
  private nameCounter = 0;

  /**
   * Add a bot to the match.
   * Returns the created Player or null if the match is full.
   */
  addBot(match: Match, difficulty: 1 | 2 | 3 | 4 | 5, characterId?: string): Player | null {
    if (match.players.length >= match.maxPlayers) {
      return null;
    }

    // Resolve character: use provided id, or pick a random one
    const charId =
      characterId && getCharacter(characterId)
        ? characterId
        : CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].id;
    const charStats = getCharacter(charId)!;

    const botId = `bot-${uuidv4()}`;
    const name = getBotName(this.nameCounter++ % BOT_NAME_POOL.length);

    const bot: Player = {
      id: botId,
      name,
      character: charId,
      isBot: true,
      botDifficulty: difficulty,
      position: { x: 400, y: 580 },
      velocity: { x: 0, y: 0 },
      facing: 'right',
      currentDamage: 0,
      currentLives: 3,
      isBlocking: false,
      blockCooldown: 0,
      isGrounded: false,
      jumpsRemaining: charStats.maxJumps,
      // Bots are immediately ready
      status: 'ready',
      invulnerableUntil: 0,
      inputState: {
        left: false,
        right: false,
        jump: false,
        attack: false,
        block: false,
        throwBomb: false,
        pickup: false,
        useWeapon: false,
        duck: false,
      },
      color: charStats.color,
      currentWeapon: null,
      weaponCooldownUntil: 0,
      bombCooldownUntil: 0,
      freezeUntil: 0,
      shieldSplitterUntil: 0,
      damageMitigation: 0,
      forceFieldUntil: 0,
    };

    match.players.push(bot);
    return bot;
  }

  /** Remove a specific bot from the match. */
  removeBot(match: Match, botId: string): void {
    const idx = match.players.findIndex(p => p.id === botId && p.isBot);
    if (idx !== -1) {
      clearBotState(match.players[idx]);
      match.players.splice(idx, 1);
    }
  }

  /** Remove all bots from the match. */
  removeAllBots(match: Match): void {
    const bots = match.players.filter(p => p.isBot);
    for (const bot of bots) {
      clearBotState(bot);
    }
    match.players = match.players.filter(p => !p.isBot);
  }

  /**
   * Run AI for all bots in the match.
   * Called every game-loop tick.
   */
  updateBots(match: Match, now: number): void {
    for (const player of match.players) {
      if (player.isBot) {
        evaluate(player, match, now);
      }
    }
  }
}
