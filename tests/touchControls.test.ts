import { describe, expect, it } from 'vitest';
import { directionFromDelta } from '../src/systems/touchControls';

describe('directionFromDelta', () => {
  it('ignores a tap (no movement)', () => {
    expect(directionFromDelta(0, 0, 8)).toBeNull();
  });

  it('ignores a tiny drag inside the deadzone', () => {
    expect(directionFromDelta(3, 2, 8)).toBeNull();
  });

  it('picks the dominant horizontal axis', () => {
    expect(directionFromDelta(20, 5, 8)).toBe('right');
  });

  it('picks the dominant vertical axis', () => {
    expect(directionFromDelta(-4, -30, 8)).toBe('up');
  });

  it('breaks ties vertically', () => {
    expect(directionFromDelta(10, 10, 8)).toBe('down');
  });
});
