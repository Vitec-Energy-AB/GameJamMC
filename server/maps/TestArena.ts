import { GameMap } from '../../shared/types';

export const testArena: GameMap = {
  name: 'Test Arena',
  platforms: [
    // Ground platform
    { x: 0, y: 620, width: 1200, height: 80, type: 'solid' },
    // Platform 1 (left lower)
    { x: 80, y: 450, width: 200, height: 20, type: 'passthrough' },
    // Platform 2 (left middle)
    { x: 220, y: 300, width: 200, height: 20, type: 'passthrough' },
    // Platform 3 (top center)
    { x: 500, y: 180, width: 200, height: 20, type: 'passthrough' },
    // Platform 4 (right middle)
    { x: 780, y: 300, width: 200, height: 20, type: 'passthrough' },
    // Platform 5 (right lower)
    { x: 920, y: 450, width: 200, height: 20, type: 'passthrough' },
  ],
  spawnPoints: [
    { x: 200, y: 580 },
    { x: 400, y: 580 },
    { x: 800, y: 580 },
    { x: 1000, y: 580 },
  ],
  itemSpawnPoints: [
    { x: 320, y: 260 }, // on platform 2
    { x: 600, y: 140 }, // on platform 3
    { x: 880, y: 260 }, // on platform 4
  ],
  blastZones: {
    top: -400,
    bottom: 800,
    left: -1000,
    right: 2300,
  },
};
