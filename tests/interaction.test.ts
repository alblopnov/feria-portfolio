import { describe, expect, it } from 'vitest';
import { facingTile, findInteractable } from '../src/systems/interaction';
import type { MapObject } from '../src/systems/mapObjects';

describe('facingTile', () => {
  it('returns the tile in front of the player', () => {
    expect(facingTile({ x: 5, y: 5 }, 'left')).toEqual({ x: 4, y: 5 });
    expect(facingTile({ x: 5, y: 5 }, 'up')).toEqual({ x: 5, y: 4 });
  });
});

describe('findInteractable', () => {
  const objects: MapObject[] = [
    { id: 'portada', type: 'spawn', tile: { x: 1, y: 1 } },
    { id: '', type: 'npc', tile: { x: 3, y: 4 }, text: 'Hola' },
    { id: 'caseta', type: 'building', tile: { x: 7, y: 2 } },
  ];

  it('returns the object on the target tile', () => {
    expect(findInteractable(objects, { x: 3, y: 4 })?.text).toBe('Hola');
    expect(findInteractable(objects, { x: 7, y: 2 })?.id).toBe('caseta');
  });

  it('returns undefined on an empty tile', () => {
    expect(findInteractable(objects, { x: 0, y: 0 })).toBeUndefined();
  });

  it('ignores objects that are not interactable, like the spawn point', () => {
    expect(findInteractable(objects, { x: 1, y: 1 })).toBeUndefined();
  });
});
