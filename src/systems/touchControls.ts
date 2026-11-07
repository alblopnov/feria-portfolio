import type { Direction } from './gridMovement';

/**
 * Turns a virtual-stick drag into one of the four walking directions. Drags shorter than `deadzone`
 * (taps, finger wobble) give `null`, so they never move the player. Otherwise the longer axis wins,
 * and a perfect diagonal goes vertical.
 */
export function directionFromDelta(dx: number, dy: number, deadzone: number): Direction | null {
  if (Math.hypot(dx, dy) < deadzone) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** True on phones and tablets (any touch points or a coarse primary pointer). */
export function isTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return (navigator.maxTouchPoints ?? 0) > 0 || coarse;
}
