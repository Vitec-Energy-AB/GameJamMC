import { GameMap } from '../types';

export const steelWorks: GameMap = {
  name: 'Stålverket',
  platforms: [
    // Ground – split with a gap in the middle to force more vertical play
    { x: 0, y: 620, width: 480, height: 80, type: 'solid' },
    { x: 720, y: 620, width: 480, height: 80, type: 'solid' },
    // Narrow upper platforms
    { x: 120, y: 460, width: 160, height: 18, type: 'passthrough' },
    { x: 920, y: 460, width: 160, height: 18, type: 'passthrough' },
    // Mid-height center – very narrow, forces players onto moving platforms
    { x: 530, y: 350, width: 140, height: 18, type: 'passthrough' },
    // High platforms
    { x: 260, y: 230, width: 180, height: 18, type: 'passthrough' },
    { x: 760, y: 230, width: 180, height: 18, type: 'passthrough' },
  ],
  spawnPoints: [
    { x: 150, y: 580 },
    { x: 350, y: 580 },
    { x: 850, y: 580 },
    { x: 1050, y: 580 },
  ],
  itemSpawnPoints: [
    { x: 340, y: 420 },
    { x: 600, y: 310 },
    { x: 860, y: 420 },
  ],
  blastZones: {
    top: -400,
    bottom: 800,
    left: -1000,
    right: 2300,
  },
  movingPlatforms: [
    {
      platform: { x: 380, y: 480, width: 180, height: 18, type: 'passthrough' },
      minX: 380,
      maxX: 640,
      speed: 80,
    },
    {
      platform: { x: 600, y: 380, width: 160, height: 18, type: 'passthrough' },
      minX: 440,
      maxX: 760,
      speed: 60,
    },
  ],
};
