import { step, type Direction, type Tile } from './gridMovement';
import type { MapObject } from './mapObjects';

/** Spawns and exits are walked onto, never talked to. */
const PASSIVE: ReadonlySet<MapObject['type']> = new Set(['spawn', 'exit']);

export function facingTile(pos: Tile, dir: Direction): Tile {
  return step(pos, dir);
}

export function findInteractable(objects: MapObject[], target: Tile): MapObject | undefined {
  return objects.find((o) => !PASSIVE.has(o.type) && o.tile.x === target.x && o.tile.y === target.y);
}
