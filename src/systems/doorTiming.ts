export type DoorTiming = {
  /** Entering: the door leaf swings open. */
  open: number;
  /** Entering: the player steps into the doorway. */
  step: number;
  /** Entering: the old scene fades to black. */
  fadeOut: number;
  /** Either way: the new scene fades in. */
  fadeIn: number;
  /** Leaving: the room fades to black after the player steps on the exit mat. */
  leave: number;
  /** Leaving: the player walks out of the open doorway. */
  out: number;
  /** Leaving: the door swings shut behind the player. */
  close: number;
};

/** Durations in milliseconds for entering and leaving a door; with reduced motion only short fades remain. */
export function doorTiming(reducedMotion: boolean): DoorTiming {
  return reducedMotion
    ? { open: 0, step: 0, fadeOut: 120, fadeIn: 120, leave: 120, out: 0, close: 0 }
    : { open: 450, step: 300, fadeOut: 350, fadeIn: 450, leave: 350, out: 300, close: 350 };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
