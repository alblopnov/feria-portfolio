import { describe, expect, it } from 'vitest';
import { parseObjects } from '../src/systems/mapObjects';

describe('parseObjects', () => {
  it('converts pixel coordinates to tiles and reads the id property', () => {
    const layer = {
      objects: [{ x: 32, y: 48, type: 'building', properties: [{ name: 'id', value: 'caseta' }] }],
    };
    expect(parseObjects(layer, 16)).toEqual([{ id: 'caseta', type: 'building', tile: { x: 2, y: 3 } }]);
  });

  it('floors positions that are not tile-aligned', () => {
    const layer = { objects: [{ x: 47.9, y: 16.2, type: 'sign', properties: [{ name: 'id', value: 's' }] }] };
    expect(parseObjects(layer, 16)[0].tile).toEqual({ x: 2, y: 1 });
  });

  it("maps an object without an id property to id ''", () => {
    expect(parseObjects({ objects: [{ x: 0, y: 0, type: 'npc' }] }, 16)[0].id).toBe('');
    expect(parseObjects({ objects: [{ x: 0, y: 0, type: 'npc', properties: [] }] }, 16)[0].id).toBe('');
  });

  it('reads an optional text property', () => {
    const layer = {
      objects: [
        { x: 0, y: 0, type: 'sign', properties: [{ name: 'text', value: 'Hola' }] },
        { x: 16, y: 0, type: 'npc' },
      ],
    };
    const [sign, npc] = parseObjects(layer, 16);
    expect(sign.text).toBe('Hola');
    expect(npc.text).toBeUndefined();
  });
});
