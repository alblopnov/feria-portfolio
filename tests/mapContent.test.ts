import { describe, expect, it } from 'vitest';
import feria from '../public/assets/maps/feria.json';
import { findMissingIds, projects } from '../src/content/projects';
import { parseObjects } from '../src/systems/mapObjects';
import { TILE_SIZE } from '../src/config';

type RawLayer = { name: string; type: string; data?: number[]; objects?: Parameters<typeof parseObjects>[0]['objects'] };

const layers = feria.layers as RawLayer[];
const objectLayer = layers.find((l) => l.name === 'objects');
const objects = parseObjects({ objects: objectLayer?.objects ?? [] }, TILE_SIZE);

describe('feria.json', () => {
  it('is a 40x30 map of 16px tiles with the five layers', () => {
    expect(feria.width).toBe(40);
    expect(feria.height).toBe(30);
    expect(feria.tilewidth).toBe(TILE_SIZE);
    expect(layers.map((l) => l.name)).toEqual(['ground', 'decor', 'overhead', 'collision', 'objects']);
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

  it('has at least three NPCs, each with its own non-empty text', () => {
    const npcs = objects.filter((o) => o.type === 'npc');
    expect(npcs.length).toBeGreaterThanOrEqual(3);
    for (const npc of npcs) expect((npc.text ?? '').trim().length, npc.id).toBeGreaterThan(0);
    expect(new Set(npcs.map((n) => n.text)).size).toBe(npcs.length);
  });

  it('has a distant fairground attraction drawn from feria-custom tiles, behind collision', () => {
    const noria = objects.find((o) => o.type === 'sign' && o.id === 'noria');
    expect(noria).toBeDefined();
    const at = (name: string) => layers.find((l) => l.name === name)!.data![noria!.tile.y * feria.width + noria!.tile.x];
    expect(at('collision')).not.toBe(0);
    expect(at('decor')).toBeGreaterThanOrEqual(feria.tilesets[1].firstgid);
  });

  it('keeps every building, NPC and sign reachable on foot from the portada', () => {
    const blocked = layers.find((l) => l.name === 'collision')!.data!;
    const key = (x: number, y: number) => y * feria.width + x;
    const spawn = objects.find((o) => o.type === 'spawn' && o.id === 'portada')!.tile;
    const seen = new Set([key(spawn.x, spawn.y)]);
    const queue = [spawn];
    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= feria.width || ny >= feria.height) continue;
        if (blocked[key(nx, ny)] !== 0 || seen.has(key(nx, ny))) continue;
        seen.add(key(nx, ny));
        queue.push({ x: nx, y: ny });
      }
    }
    for (const o of objects.filter((o) => ['building', 'door', 'npc', 'sign'].includes(o.type))) {
      const { x, y } = o.tile;
      const reachable = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([nx, ny]) => seen.has(key(nx, ny)));
      expect(reachable, `${o.type} ${o.id} at ${x},${y}`).toBe(true);
    }
  });

  it('has the portada spawn', () => {
    expect(objects.some((o) => o.type === 'spawn' && o.id === 'portada')).toBe(true);
  });

  it('only uses tile gids covered by its tilesets (base and feria-custom)', () => {
    expect(feria.tilesets.map((t) => t.name)).toEqual(['feria', 'feria-custom']);
    const maxGid = Math.max(...feria.tilesets.map((t) => t.firstgid + t.tilecount - 1));
    const used = layers.flatMap((l) => l.data ?? []);
    expect(used.some((g) => g > feria.tilesets[1].firstgid - 1)).toBe(true);
    for (const gid of used) expect(gid >= 0 && gid <= maxGid, String(gid)).toBe(true);
  });

  it('has a Credits sign and an under-construction sign by every locked caseta', () => {
    const credits = objects.find((o) => o.type === 'sign' && o.id === 'credits');
    expect(credits?.text).toMatch(/tools\//);
    for (const project of Object.values(projects).filter((p) => p.locked)) {
      expect(objects.some((o) => o.type === 'sign' && o.id === `${project.id}-works`), project.id).toBe(true);
    }
  });
});
