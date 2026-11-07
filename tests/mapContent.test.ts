import { describe, expect, it } from 'vitest';
import feria from '../public/assets/maps/feria.json';
import { findMissingIds, projects } from '../src/content/projects';
import { parseObjects } from '../src/systems/mapObjects';
import { TILE_SIZE } from '../src/config';

type RawLayer = { name: string; type: string; objects?: Parameters<typeof parseObjects>[0]['objects'] };

const layers = feria.layers as RawLayer[];
const objectLayer = layers.find((l) => l.name === 'objects');
const objects = parseObjects({ objects: objectLayer?.objects ?? [] }, TILE_SIZE);

describe('feria.json', () => {
  it('is a 40x30 map of 16px tiles with the four layers', () => {
    expect(feria.width).toBe(40);
    expect(feria.height).toBe(30);
    expect(feria.tilewidth).toBe(TILE_SIZE);
    expect(layers.map((l) => l.name)).toEqual(['ground', 'decor', 'collision', 'objects']);
  });

  it('has only building and door ids that exist in projects.ts', () => {
    const ids = objects.filter((o) => o.type === 'building' || o.type === 'door').map((o) => o.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(findMissingIds(ids)).toEqual([]);
  });

  it('places a building for every project', () => {
    const ids = new Set(objects.filter((o) => o.type === 'building').map((o) => o.id));
    for (const id of Object.keys(projects)) expect(ids.has(id), id).toBe(true);
  });

  it('has at least one NPC and one sign with text', () => {
    for (const type of ['npc', 'sign'] as const) {
      expect(objects.some((o) => o.type === type && (o.text ?? '').length > 0), type).toBe(true);
    }
  });

  it('has the portada spawn', () => {
    expect(objects.some((o) => o.type === 'spawn' && o.id === 'portada')).toBe(true);
  });
});
