export type AudioGate = { unlock(): void; isUnlocked(): boolean };

/**
 * Browsers block audio until the visitor interacts with the page. The gate runs `start` (for example,
 * begin the ambient loop) on the first successful unlock only. A throwing `start` never escapes: the
 * gate stays locked so a later key press or tap can retry, and the game keeps running either way.
 */
export function createAudioGate(start: () => void): AudioGate {
  let unlocked = false;
  return {
    unlock() {
      if (unlocked) return;
      try {
        start();
        unlocked = true;
      } catch (err) {
        console.warn('Audio could not start yet:', err);
      }
    },
    isUnlocked: () => unlocked,
  };
}
