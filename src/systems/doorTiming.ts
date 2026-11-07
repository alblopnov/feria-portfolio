export type DoorTiming = {
  /** The door leaf swings open. */
  open: number;
  /** The player steps into the doorway. */
  step: number;
  /** The old scene fades to black. */
  fadeOut: number;
  /** The new scene fades in. */
  fadeIn: number;
};

/** Durations in milliseconds for entering a door; with reduced motion only short fades remain. */
export function doorTiming(reducedMotion: boolean): DoorTiming {
  return reducedMotion ? { open: 0, step: 0, fadeOut: 120, fadeIn: 120 } : { open: 260, step: 160, fadeOut: 200, fadeIn: 250 };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
