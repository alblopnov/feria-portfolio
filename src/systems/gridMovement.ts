export type Direction = 'up' | 'down' | 'left' | 'right';
export type Tile = { x: number; y: number };

const DELTAS: Record<Direction, Tile> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function step(pos: Tile, dir: Direction): Tile {
  const d = DELTAS[dir];
  return { x: pos.x + d.x, y: pos.y + d.y };
}

export function canMove(
  pos: Tile,
  dir: Direction,
  isBlocked: (t: Tile) => boolean,
  bounds: { width: number; height: number },
): boolean {
  const next = step(pos, dir);
  const inside = next.x >= 0 && next.y >= 0 && next.x < bounds.width && next.y < bounds.height;
  return inside && !isBlocked(next);
}

/** `pressed` is ordered oldest to newest; the newest held direction wins so no diagonal is ever produced. */
export function resolveDirection(pressed: Direction[], _last: Direction | null): Direction | null {
  return pressed.length > 0 ? pressed[pressed.length - 1] : null;
}
