import { describe, expect, it } from 'vitest';
import casetaMap from '../public/assets/maps/caseta.json';
import aboutMap from '../public/assets/maps/about.json';
import actionDetectionMap from '../public/assets/maps/action-detection.json';
import volunteerPwaMap from '../public/assets/maps/volunteer-pwa.json';
import secureVotingMap from '../public/assets/maps/secure-voting.json';
import { interiors } from '../src/content/interiors';
import { getProject, projects } from '../src/content/projects';
import { parseObjects } from '../src/systems/mapObjects';
import { TILE_SIZE } from '../src/config';

type RawMap = {
  width: number;
  layers: { name: string; data?: number[]; objects?: Parameters<typeof parseObjects>[0]['objects'] }[];
  tilesets: { name: string; firstgid: number; tilecount: number }[];
};
/** Every interior map file, by the path the registry uses for it. */
const MAP_FILES: Record<string, unknown> = {
  'assets/maps/caseta.json': casetaMap,
  'assets/maps/about.json': aboutMap,
  'assets/maps/action-detection.json': actionDetectionMap,
  'assets/maps/volunteer-pwa.json': volunteerPwaMap,
  'assets/maps/secure-voting.json': secureVotingMap,
};
const loadMap = (mapFile: string): RawMap => {
  const map = MAP_FILES[mapFile];
  if (!map) throw new Error(`no map imported for ${mapFile}`);
  return map as RawMap;
};
const objectsOf = (map: RawMap) => parseObjects({ objects: map.layers.find((l) => l.name === 'objects')?.objects ?? [] }, TILE_SIZE);
const maps = Object.entries(interiors).map(([key, entry]) => ({ key, map: loadMap(entry.mapFile) }));
const mapFor = (key: string) => maps.find((m) => m.key === key)!.map;

/** The finished CV projects that each have a room with one exhibit. */
const CV_PROJECTS = ['action-detection', 'volunteer-pwa', 'secure-voting'];

describe('interiors', () => {
  it('has an entry for every interior used by projects.ts', () => {
    for (const p of Object.values(projects)) {
      if (p.interior !== null) expect(Object.keys(interiors), p.id).toContain(p.interior);
    }
  });

  it('points every entry at a .json map file under assets/maps/', () => {
    for (const [key, entry] of Object.entries(interiors)) {
      expect(entry.mapFile, key).toMatch(/^assets\/maps\/[a-z-]+\.json$/);
      expect(entry.mapKey, key).toBe(`interior-${key}`);
    }
  });

  it('gives each interior map an entry spawn standing right above the exit mat', () => {
    for (const { key, map } of maps) {
      const objects = objectsOf(map);
      const spawn = objects.find((o) => o.type === 'spawn' && o.id === 'entry');
      const exit = objects.find((o) => o.type === 'exit');
      expect(spawn, key).toBeDefined();
      expect(exit, key).toBeDefined();
      expect(spawn!.tile, key).toEqual({ x: exit!.tile.x, y: exit!.tile.y - 1 });
    }
  });

  it('puts a jukebox in the caseta and a bookshelf and desk in the about house', () => {
    expect(objectsOf(mapFor('caseta')).map((o) => o.type)).toContain('jukebox');
    const about = objectsOf(mapFor('about')).map((o) => o.type);
    expect(about).toContain('bookshelf');
    expect(about).toContain('desk');
  });

  it('gives each CV project room exactly one exhibit, naming that project', () => {
    for (const id of CV_PROJECTS) {
      const exhibits = objectsOf(mapFor(id)).filter((o) => o.type === 'exhibit');
      expect(exhibits.map((o) => o.id), id).toEqual([id]);
    }
  });

  it('only uses exhibit ids that are known projects', () => {
    for (const { key, map } of maps) {
      for (const o of objectsOf(map).filter((o) => o.type === 'exhibit')) expect(getProject(o.id), `${key}: ${o.id}`).toBeDefined();
    }
  });

  it('only uses tile gids covered by the three tilesets', () => {
    for (const { key, map } of maps) {
      expect(map.tilesets.map((t) => t.name), key).toEqual(['feria', 'feria-custom', 'feria-projects']);
      const maxGid = Math.max(...map.tilesets.map((t) => t.firstgid + t.tilecount - 1));
      for (const gid of map.layers.flatMap((l) => l.data ?? [])) expect(gid >= 0 && gid <= maxGid, `${key}: ${gid}`).toBe(true);
    }
  });

  it('furnishes each CV project room with tiles from feria-projects', () => {
    for (const id of CV_PROJECTS) {
      const map = mapFor(id);
      const first = map.tilesets[2].firstgid;
      expect(map.layers.find((l) => l.name === 'decor')!.data!.some((g) => g >= first), id).toBe(true);
    }
  });
});
