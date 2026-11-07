import { describe, expect, it, vi } from 'vitest';
import { createAudioGate } from '../src/systems/audioGate';

describe('createAudioGate', () => {
  it('calls start exactly once when unlocked twice', () => {
    const start = vi.fn();
    const gate = createAudioGate(start);
    gate.unlock();
    gate.unlock();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('is locked until unlock succeeds', () => {
    const gate = createAudioGate(() => {});
    expect(gate.isUnlocked()).toBe(false);
    gate.unlock();
    expect(gate.isUnlocked()).toBe(true);
  });

  it('swallows a throwing start, stays locked and lets a later unlock retry', () => {
    let calls = 0;
    const gate = createAudioGate(() => {
      calls++;
      if (calls === 1) throw new Error('autoplay blocked');
    });
    expect(() => gate.unlock()).not.toThrow();
    expect(gate.isUnlocked()).toBe(false);
    gate.unlock();
    expect(calls).toBe(2);
    expect(gate.isUnlocked()).toBe(true);
  });
});
