import { describe, expect, it } from 'vitest';
import { canMove, resolveDirection, step } from '../src/systems/gridMovement';

const bounds = { width: 10, height: 8 };
const free = () => false;

describe('step', () => {
  it('moves one tile in each direction', () => {
    expect(step({ x: 2, y: 2 }, 'up')).toEqual({ x: 2, y: 1 });
    expect(step({ x: 2, y: 2 }, 'down')).toEqual({ x: 2, y: 3 });
    expect(step({ x: 2, y: 2 }, 'left')).toEqual({ x: 1, y: 2 });
    expect(step({ x: 2, y: 2 }, 'right')).toEqual({ x: 3, y: 2 });
  });
});

describe('canMove', () => {
  it('allows a free tile', () => {
    expect(canMove({ x: 2, y: 2 }, 'up', free, bounds)).toBe(true);
  });

  it('blocks a blocked tile', () => {
    const blockedAt = (t: { x: number; y: number }) => t.x === 3 && t.y === 2;
    expect(canMove({ x: 2, y: 2 }, 'right', blockedAt, bounds)).toBe(false);
  });

  it('blocks leaving the map on every edge', () => {
    expect(canMove({ x: 0, y: 3 }, 'left', free, bounds)).toBe(false);
    expect(canMove({ x: 3, y: 0 }, 'up', free, bounds)).toBe(false);
    expect(canMove({ x: 9, y: 3 }, 'right', free, bounds)).toBe(false);
    expect(canMove({ x: 3, y: 7 }, 'down', free, bounds)).toBe(false);
  });
});

describe('resolveDirection', () => {
  it('uses only the most recently pressed direction', () => {
    expect(resolveDirection(['up', 'right'], 'up')).toBe('right');
  });

  it('keeps the last direction if it is still held', () => {
    expect(resolveDirection(['up'], 'up')).toBe('up');
  });

  it('returns null when nothing is held', () => {
    expect(resolveDirection([], 'up')).toBeNull();
  });
});
