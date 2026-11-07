import { describe, expect, it } from 'vitest';
import casetaMap from '../public/assets/maps/caseta.json';
import aboutMap from '../public/assets/maps/about.json';
import { interiors } from '../src/content/interiors';
import { projects } from '../src/content/projects';
import { parseObjects } from '../src/systems/mapObjects';
import { TILE_SIZE } from '../src/config';

type RawLayer = { name: string; objects?: Parameters<typeof parseObjects>[0]['objects'] };
const objectsOf = (map: { layers: unknown[] }) =>
  parseObjects({ objects: (map.layers as RawLayer[]).find((l) => l.name === 'objects')?.objects ?? [] }, TILE_SIZE);

describe('interiors', () => {
  it('has an entry for every interior used by projects.ts', () => {
    for (const p of Object.values(projects)) {
      if (p.interior !== null) expect(Object.keys(interiors), p.id).toContain(p.interior);
    }
  });

  it('points every entry at a .json map file', () => {
    for (const [key, entry] of Object.entries(interiors)) {
      expect(entry.mapFile.length, key).toBeGreaterThan(0);
      expect(entry.mapFile.endsWith('.json'), key).toBe(true);
      expect(entry.mapKey.length, key).toBeGreaterThan(0);
    }
  });

  it('gives each interior map a spawn and an exit', () => {
    for (const map of [casetaMap, aboutMap]) {
      const types = objectsOf(map).map((o) => o.type);
      expect(types).toContain('spawn');
      expect(types).toContain('exit');
    }
  });

  it('puts a jukebox in the caseta and a bookshelf and desk in the about house', () => {
    expect(objectsOf(casetaMap).map((o) => o.type)).toContain('jukebox');
    const about = objectsOf(aboutMap).map((o) => o.type);
    expect(about).toContain('bookshelf');
    expect(about).toContain('desk');
  });
});
