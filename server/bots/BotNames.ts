/** Swedish-themed bot names (without the "Bot-" prefix). */
export const BOT_NAME_POOL: string[] = [
  'Varg', 'Eld', 'Storm', 'Frost', 'Skog',
  'Järn', 'Sten', 'Dimma', 'Is', 'Åska',
  'Björn', 'Örn', 'Ulv', 'Lo', 'Räv',
  'Sol', 'Måne', 'Stjärna', 'Vind', 'Hav',
  'Berg', 'Dal', 'Älv', 'Sjö', 'Moln',
  'Gnist', 'Flod', 'Kust', 'Klint', 'Malm',
];

/** Returns a name like "Bot-Varg", cycling through the pool. */
export function getBotName(index: number): string {
  const base = BOT_NAME_POOL[index % BOT_NAME_POOL.length];
  return `Bot-${base}`;
}
