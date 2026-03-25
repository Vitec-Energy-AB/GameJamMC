// TypeScript source - the compiled/inline version is in index.html
// This file serves as typed reference and can be compiled with tsconfig.client.json

import { io, Socket } from 'socket.io-client';
import { Match, Player, Bomb, InputState } from '../shared/types';
import { initTouchInput } from './InputHandler';

const roomId = (window.location.pathname.split('/')[1] || 'lobby').replace(/[^a-zA-Z0-9_-]/g, '') || 'lobby';
const socket: Socket = io();

let localPlayerId: string | null = null;
let currentMatch: Match | null = null;
let inGame = false;

socket.on('connect', () => { localPlayerId = socket.id ?? null; });
socket.on('match:start', (match: Match) => { currentMatch = match; inGame = true; });
socket.on('state:update', (state: any) => { /* handled by renderer */ });

// Wire touch/swipe input for mobile devices
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
const shootBtn = document.getElementById('shootBtn') as HTMLElement | null;
if (canvas) {
  initTouchInput(canvas, shootBtn);
}
