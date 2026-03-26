import { GameMap } from '../types';

export const volcanoPeak: GameMap = {
  name: 'Vulkantoppen',
  platforms: [
    // Wide but short ground ledges – fall into the volcano gap in the middle
    { x: 0, y: 640, width: 320, height: 60, type: 'solid' },
    { x: 880, y: 640, width: 320, height: 60, type: 'solid' },
    // Mid-level platforms (static)
    { x: 420, y: 540, width: 360, height: 20, type: 'passthrough' },
    // High ledges
    { x: 80, y: 380, width: 200, height: 20, type: 'passthrough' },
    { x: 920, y: 380, width: 200, height: 20, type: 'passthrough' },
    // Top-center static platform
    { x: 520, y: 200, width: 160, height: 20, type: 'passthrough' },
  ],
  spawnPoints: [
    { x: 120, y: 600 },
    { x: 240, y: 600 },
    { x: 940, y: 600 },
    { x: 1060, y: 600 },
  ],
  itemSpawnPoints: [
    { x: 160, y: 340 },
    { x: 540, y: 500 },
    { x: 600, y: 160 },
    { x: 980, y: 340 },
  ],
  blastZones: {
    top: -500,
    bottom: 900,
    left: -1000,
    right: 2300,
  },
  crumblingPlatforms: [
    // Three crumbling platforms across the lava gap
    { platform: { x: 330, y: 540, width: 120, height: 20, type: 'passthrough' } },
    { platform: { x: 540, y: 430, width: 120, height: 20, type: 'passthrough' } },
    { platform: { x: 750, y: 540, width: 120, height: 20, type: 'passthrough' } },
  ],
};
