const INTERPOLATION_DELAY = 100;

interface BufferedState {
  players: any[];
  bombs: any[];
  tick: number;
  receivedAt: number;
}

const buffer: BufferedState[] = [];

export function pushState(state: any): void {
  buffer.push({ ...state, receivedAt: Date.now() });
  if (buffer.length > 20) buffer.shift();
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export function getInterpolatedState(): BufferedState | null {
  const now = Date.now() - INTERPOLATION_DELAY;
  if (buffer.length === 0) return null;
  if (buffer.length === 1) return buffer[0];

  let older: BufferedState | null = null, newer: BufferedState | null = null;
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i].receivedAt <= now) { older = buffer[i]; break; }
    newer = buffer[i];
  }
  if (!older) return buffer[0];
  if (!newer) return buffer[buffer.length - 1];

  const t = Math.min(1, (now - older.receivedAt) / (newer.receivedAt - older.receivedAt || 1));
  const players = newer.players.map((np: any) => {
    const op = older!.players.find((p: any) => p.id === np.id);
    if (!op) return np;
    return { ...np, position: { x: lerp(op.position.x, np.position.x, t), y: lerp(op.position.y, np.position.y, t) } };
  });
  return { ...newer, players };
}
