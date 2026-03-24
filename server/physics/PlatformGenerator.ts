import { Match, Platform } from '../../shared/types';
import { Server } from 'socket.io';

const VERTICAL_GAP_MIN = 100;
const VERTICAL_GAP_MAX = 160;
const PLATFORMS_PER_ROW_MIN = 1;
const PLATFORMS_PER_ROW_MAX = 2;
const PLATFORM_WIDTH_MIN = 60;
const PLATFORM_WIDTH_MAX = 150;
const PLATFORM_HEIGHT = 15;
const GENERATION_AHEAD = 300; // Generate platforms 300px above lava
const MAP_WIDTH = 1200;
const PLATFORM_MARGIN = 30;
const MIN_PLATFORM_SPACING = 30; // Minimum horizontal gap between platforms

interface GeneratorState {
  highestGeneratedY: number;
  rowCount: number;
}

const generatorStates: Map<string, GeneratorState> = new Map();

export function initPlatformGenerator(match: Match): void {
  let highestY = Infinity;
  for (const p of match.map.platforms) {
    if (p.y < highestY) highestY = p.y;
  }
  generatorStates.set(match.roomId, {
    highestGeneratedY: highestY,
    rowCount: 0,
  });
}

export function updatePlatformGeneration(match: Match, io: Server): void {
  const lava = match.lavaState;
  if (!lava || !lava.active) return;

  const state = generatorStates.get(match.roomId);
  if (!state) return;

  const targetY = lava.currentY - GENERATION_AHEAD;

  while (state.highestGeneratedY > targetY) {
    const gap = VERTICAL_GAP_MIN + Math.random() * (VERTICAL_GAP_MAX - VERTICAL_GAP_MIN);
    const newY = state.highestGeneratedY - gap;

    const numPlatforms = PLATFORMS_PER_ROW_MIN +
      Math.floor(Math.random() * (PLATFORMS_PER_ROW_MAX - PLATFORMS_PER_ROW_MIN + 1));

    const newPlatforms: Platform[] = [];
    const usedRanges: { min: number; max: number }[] = [];

    for (let i = 0; i < numPlatforms; i++) {
      const width = PLATFORM_WIDTH_MIN +
        Math.floor(Math.random() * (PLATFORM_WIDTH_MAX - PLATFORM_WIDTH_MIN + 1));

      let x: number;
      let attempts = 0;
      do {
        x = PLATFORM_MARGIN + Math.random() * (MAP_WIDTH - width - PLATFORM_MARGIN * 2);
        attempts++;
      } while (attempts < 20 && usedRanges.some(r =>
        x < r.max + MIN_PLATFORM_SPACING && x + width > r.min - MIN_PLATFORM_SPACING
      ));
      // Clamp to ensure platform stays within map bounds
      x = Math.max(PLATFORM_MARGIN, Math.min(x, MAP_WIDTH - width - PLATFORM_MARGIN));

      usedRanges.push({ min: x, max: x + width });

      const platform: Platform = {
        x: Math.round(x),
        y: Math.round(newY),
        width,
        height: PLATFORM_HEIGHT,
        type: 'passthrough',
      };
      newPlatforms.push(platform);
      match.map.platforms.push(platform);

      if (state.rowCount % 3 === 0 && i === 0) {
        match.map.itemSpawnPoints.push({
          x: Math.round(x + width / 2),
          y: Math.round(newY - 20),
        });
      }
    }

    if (state.rowCount % 2 === 0 && newPlatforms.length > 0) {
      const sp = newPlatforms[Math.floor(Math.random() * newPlatforms.length)];
      match.map.spawnPoints.push({
        x: sp.x + sp.width / 2,
        y: sp.y - 60,
      });
      match.map.spawnPoints = match.map.spawnPoints.filter(
        s => s.y < lava.currentY - 50
      );
    }

    state.highestGeneratedY = newY;
    state.rowCount++;

    io.to(match.roomId).emit('platforms:generated', {
      platforms: newPlatforms,
    });
  }

  // Clean up platforms far below lava (performance)
  const cleanupThreshold = lava.currentY + 200;
  match.map.platforms = match.map.platforms.filter(p => p.y < cleanupThreshold);
}

export function resetPlatformGenerator(roomId: string): void {
  generatorStates.delete(roomId);
}
