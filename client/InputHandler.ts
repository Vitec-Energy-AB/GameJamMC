import { InputState } from '../shared/types';

const state: InputState = {
  left: false, right: false, jump: false,
  attack: false, block: false, throwBomb: false,
  pickup: false, useWeapon: false, duck: false,
};

window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': state.left = true; break;
    case 'ArrowRight': case 'KeyD': state.right = true; break;
    case 'ArrowUp': case 'KeyW': case 'Space': state.jump = true; break;
    case 'ArrowDown': case 'KeyS': state.duck = true; break;
    case 'KeyZ': state.attack = true; break;
    case 'KeyC': state.block = true; break;
    case 'KeyB': state.throwBomb = true; break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft': case 'KeyA': state.left = false; break;
    case 'ArrowRight': case 'KeyD': state.right = false; break;
    case 'ArrowUp': case 'KeyW': case 'Space': state.jump = false; break;
    case 'ArrowDown': case 'KeyS': state.duck = false; break;
    case 'KeyZ': state.attack = false; break;
    case 'KeyC': state.block = false; break;
    case 'KeyB': state.throwBomb = false; break;
  }
});

export function getInputState(): InputState { return { ...state }; }
