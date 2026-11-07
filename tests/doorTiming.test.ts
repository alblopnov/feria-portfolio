import { describe, expect, it } from 'vitest';
import { doorTiming } from '../src/systems/doorTiming';

describe('doorTiming', () => {
  it('takes about a second to swing the door, step in and fade out', () => {
    const t = doorTiming(false);
    expect(t.open).toBeGreaterThanOrEqual(400);
    expect(t.step).toBeGreaterThanOrEqual(250);
    expect(t.fadeOut).toBeGreaterThanOrEqual(300);
    const total = t.open + t.step + t.fadeOut;
    expect(total).toBeGreaterThanOrEqual(1000);
    expect(total).toBeLessThanOrEqual(1300);
  });

  it('plays a matching exit: fade out of the room, walk out of the doorway, swing the door shut', () => {
    const t = doorTiming(false);
    expect(t.leave).toBeGreaterThanOrEqual(300);
    expect(t.out).toBeGreaterThanOrEqual(250);
    expect(t.close).toBeGreaterThanOrEqual(300);
  });

  it('fades the next scene in slowly enough to be smooth', () => {
    expect(doorTiming(false).fadeIn).toBeGreaterThanOrEqual(400);
    expect(doorTiming(true).fadeIn).toBeGreaterThan(0);
  });

  it('skips every swing and step with reduced motion, keeping only short fades', () => {
    const t = doorTiming(true);
    expect([t.open, t.step, t.out, t.close]).toEqual([0, 0, 0, 0]);
    for (const fade of [t.fadeOut, t.fadeIn, t.leave]) {
      expect(fade).toBeGreaterThan(0);
      expect(fade).toBeLessThanOrEqual(150);
    }
  });
});
