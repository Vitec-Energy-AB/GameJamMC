import { Match, GameMap } from '../shared/types';
import { Server } from 'socket.io';
import { testArena } from './maps/TestArena';
import { steelWorks } from '../shared/maps/SteelWorks';
import { volcanoPeak } from '../shared/maps/VolcanoPeak';

export const AVAILABLE_MAPS: { id: string; map: GameMap; description: string }[] = [
  { id: 'testArena',   map: testArena,   description: 'En klassisk träningsarena med 5 plattformar på olika höjder.' },
  { id: 'steelWorks',  map: steelWorks,  description: 'Industriell fabrik med smala plattformar och 2 rörliga plattformar.' },
  { id: 'volcanoPeak', map: volcanoPeak, description: 'Öppen vulkanarena med krackelerade plattformar och stor vertikalitet.' },
];

export class MapSelector {
  handleVote(match: Match, playerId: string, mapId: string, io: Server): void {
    const validIds = AVAILABLE_MAPS.map(m => m.id);
    if (!validIds.includes(mapId)) return;

    match.mapVotes[playerId] = mapId;
    io.to(match.roomId).emit('map:vote', { playerId, mapId, votes: match.mapVotes });
  }

  selectMap(match: Match, io: Server): void {
    const tally: { [mapId: string]: number } = {};

    for (const mapId of Object.values(match.mapVotes)) {
      tally[mapId] = (tally[mapId] ?? 0) + 1;
    }

    let selectedId = 'testArena';
    if (Object.keys(tally).length > 0) {
      // Pick the map with the most votes; ties broken randomly
      const maxVotes = Math.max(...Object.values(tally));
      const candidates = Object.keys(tally).filter(id => tally[id] === maxVotes);
      selectedId = candidates[Math.floor(Math.random() * candidates.length)];
    }

    const entry = AVAILABLE_MAPS.find(m => m.id === selectedId) ?? AVAILABLE_MAPS[0];
    match.map = { ...entry.map };
    match.selectedMap = entry.id;

    io.to(match.roomId).emit('map:selected', {
      mapId: entry.id,
      mapName: entry.map.name,
      votes: tally,
    });
  }
}
