const MIN_SCREEN_PX = 11;
const MIN_GAME_PX = 8;
const MAX_GAME_PX = 13;
const DEFAULT_RESOLUTION = 4;
const MAX_NAME_LENGTH = 14;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Font size in game pixels for the floating name tags, chosen so the text stays at least about 11 pixels
 * tall on the screen. `scale` is screen (CSS) pixels per game pixel; on a big screen the tags keep the
 * 8px pixel-art size, on a phone they grow so they stay readable.
 */
export function tagFontPx(scale: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return MIN_GAME_PX;
  return clamp(Math.ceil(MIN_SCREEN_PX / scale), MIN_GAME_PX, MAX_GAME_PX);
}

/** Text texture resolution that draws text 1:1 with the physical screen pixels (screen scale times pixel ratio). */
export function textResolution(scale: number, devicePixelRatio: number): number {
  const physical = scale * devicePixelRatio;
  if (!Number.isFinite(physical) || physical <= 0) return DEFAULT_RESOLUTION;
  return clamp(Math.ceil(physical), 2, 8);
}

/** Splits a long name over two lines at the space nearest its middle; short names and names without a space stay as they are. */
export function wrapTag(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  const middle = name.length / 2;
  let best = -1;
  for (let i = 0; i < name.length; i++) {
    if (name[i] === ' ' && (best < 0 || Math.abs(i - middle) < Math.abs(best - middle))) best = i;
  }
  return best < 0 ? name : `${name.slice(0, best)}\n${name.slice(best + 1)}`;
}
