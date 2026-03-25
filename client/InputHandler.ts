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

// ── Touch / Swipe Input Provider ─────────────────────────────────────────────
// Provides 4-direction swipe movement and shoot button support for touch devices.
// Pointer Events are used so the same code works on mobile browsers and stylus input.
const SWIPE_THRESHOLD = 30; // CSS px

let swipePointerId: number | null = null;
let swipeStartX = 0;
let swipeStartY = 0;

function clearSwipeActions(): void {
  state.left = state.right = state.jump = state.duck = false;
}

function applySwipe(dx: number, dy: number): void {
  state.left  = dx < -SWIPE_THRESHOLD;
  state.right = dx >  SWIPE_THRESHOLD;
  state.jump  = dy < -SWIPE_THRESHOLD; // swipe up → jump
  state.duck  = dy >  SWIPE_THRESHOLD; // swipe down → duck
}

export function initTouchInput(canvas: HTMLCanvasElement, shootButton: HTMLElement | null): void {
  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    if (shootButton && (e.target === shootButton || shootButton.contains(e.target as Node))) return;
    if (swipePointerId !== null) return;
    swipePointerId = e.pointerId;
    swipeStartX = e.clientX;
    swipeStartY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (e.pointerId !== swipePointerId) return;
    applySwipe(e.clientX - swipeStartX, e.clientY - swipeStartY);
    e.preventDefault();
  }, { passive: false });

  function endSwipe(e: PointerEvent): void {
    if (e.pointerId !== swipePointerId) return;
    swipePointerId = null;
    clearSwipeActions();
  }

  canvas.addEventListener('pointerup', endSwipe);
  canvas.addEventListener('pointercancel', endSwipe);

  if (shootButton) {
    shootButton.addEventListener('pointerdown', (e: PointerEvent) => {
      state.attack = true;
      shootButton.classList.add('active');
      try { shootButton.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    }, { passive: false });

    const releaseShoot = (): void => {
      state.attack = false;
      shootButton.classList.remove('active');
    };
    shootButton.addEventListener('pointerup', releaseShoot);
    shootButton.addEventListener('pointercancel', releaseShoot);
    shootButton.addEventListener('pointerleave', releaseShoot);
  }
}

export function getInputState(): InputState { return { ...state }; }
