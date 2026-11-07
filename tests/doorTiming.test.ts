import { describe, expect, it } from 'vitest';
import { doorTiming } from '../src/systems/doorTiming';

describe('doorTiming', () => {
  it('swings the door, steps in and fades out in about half a second', () => {
    const t = doorTiming(false);
    expect(t.open).toBeGreaterThan(0);
    expect(t.step).toBeGreaterThan(0);
    expect(t.fadeOut).toBeGreaterThan(0);
    expect(t.open + t.step + t.fadeOut).toBeLessThanOrEqual(700);
  });

  it('fades the next scene in', () => {
    expect(doorTiming(false).fadeIn).toBeGreaterThan(0);
    expect(doorTiming(true).fadeIn).toBeGreaterThan(0);
  });

  it('skips the swing and the step with reduced motion, keeping only short fades', () => {
    const t = doorTiming(true);
    expect(t.open).toBe(0);
    expect(t.step).toBe(0);
    expect(t.fadeOut).toBeGreaterThan(0);
    expect(t.fadeOut).toBeLessThanOrEqual(150);
    expect(t.fadeIn).toBeLessThanOrEqual(150);
  });
});
