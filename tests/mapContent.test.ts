import { describe, expect, it } from 'vitest';
import feria from '../public/assets/maps/feria.json';
import { findMissingIds, projects } from '../src/content/projects';
import { parseObjects } from '../src/systems/mapObjects';
import { paginate } from '../src/systems/dialoguePager';
import { TILE_SIZE } from '../src/config';

type RawLayer = { name: string; type: string; data?: number[]; objects?: Parameters<typeof parseObjects>[0]['objects'] };

const layers = feria.layers as RawLayer[];
const objectLayer = layers.find((l) => l.name === 'objects');
const objects = parseObjects({ objects: objectLayer?.objects ?? [] }, TILE_SIZE);

/** The compact town: these mirror the layout constants at the top of buildFeria() in tools/gen-maps.mjs. */
const MAP_W = 34;
const MAP_H = 22;
const ROW_A_DOOR_Y = 6;
const ROW_B_DOOR_Y = 14;
const AVENUE_X = [16, 17];
/** The player walks one tile per 160 ms, about 6 tiles a second: 40 steps is under 7 seconds. */
const MAX_STEPS_FROM_SPAWN = 40;
const ROW_A = ['ml-classifier', 'java-service', 'secure-voting', 'caseta', 'dashboard'];
const ROW_B = ['about', 'action-detection', 'volunteer-pwa'];

const layer = (name: string) => layers.find((l) => l.name === name)!.data!;
const at = (data: number[], x: number, y: number) => data[y * feria.width + x];
const spawnTile = () => objects.find((o) => o.type === 'spawn' && o.id === 'portada')!.tile;
const building = (id: string) => {
  const found = objects.filter((o) => o.type === 'building' && o.id === id);
  expect(found.length, id).toBe(1);
  return found[0];
};

/** Walking steps from the portada spawn to every reachable walkable tile (BFS over the collision layer). */
function stepsFromSpawn(): Map<number, number> {
  const blocked = layer('collision');
  const key = (x: number, y: number) => y * feria.width + x;
  const spawn = spawnTile();
  const dist = new Map([[key(spawn.x, spawn.y), 0]]);
  const queue = [spawn];
  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const d = dist.get(key(x, y))!;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= feria.width || ny >= feria.height) continue;
      if (blocked[key(nx, ny)] !== 0 || dist.has(key(nx, ny))) continue;
      dist.set(key(nx, ny), d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

/** Steps to walk into (or face) a solid object tile: the nearest walkable neighbour plus one. */
function stepsTo(dist: Map<number, number>, x: number, y: number): number {
  const near = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < feria.width && ny < feria.height)
    .map(([nx, ny]) => dist.get(ny * feria.width + nx))
    .filter((d): d is number => d !== undefined);
  return near.length > 0 ? Math.min(...near) + 1 : Infinity;
}

describe('feria.json', () => {
  it('is a compact 34x22 town of 16px tiles with the five layers', () => {
    expect(feria.width).toBe(MAP_W);
    expect(feria.height).toBe(MAP_H);
    expect(feria.width).toBeLessThanOrEqual(34);
    expect(feria.height).toBeLessThanOrEqual(23);
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
    expect(at(layer('collision'), noria!.tile.x, noria!.tile.y)).not.toBe(0);
    expect(at(layer('decor'), noria!.tile.x, noria!.tile.y)).toBeGreaterThanOrEqual(feria.tilesets[1].firstgid);
  });

  it('keeps every building, NPC and sign reachable on foot from the portada', () => {
    const dist = stepsFromSpawn();
    for (const o of objects.filter((o) => ['building', 'door', 'npc', 'sign'].includes(o.type))) {
      const { x, y } = o.tile;
      expect(stepsTo(dist, x, y), `${o.type} ${o.id} at ${x},${y}`).toBeLessThan(Infinity);
    }
  });

  it('puts every door within a short walk of the spawn (40 steps, under 7 seconds)', () => {
    const dist = stepsFromSpawn();
    const steps = objects.filter((o) => o.type === 'building').map((o) => ({ id: o.id, steps: stepsTo(dist, o.tile.x, o.tile.y) }));
    for (const { id, steps: n } of steps) expect(n, id).toBeLessThanOrEqual(MAX_STEPS_FROM_SPAWN);
    expect(Math.max(...steps.map((s) => s.steps))).toBeLessThanOrEqual(MAX_STEPS_FROM_SPAWN);
  });

  it('puts the portada spawn just below the second row', () => {
    const spawn = spawnTile();
    expect(spawn.y).toBeGreaterThan(ROW_B_DOOR_Y);
    expect(spawn.y - ROW_B_DOOR_Y).toBeLessThanOrEqual(6);
  });

  it('lines up the top street casetas in one row, left to right, with tight gaps', () => {
    const doors = ROW_A.map((id) => building(id).tile);
    for (const [i, d] of doors.entries()) expect(d.y, ROW_A[i]).toBe(ROW_A_DOOR_Y);
    for (let i = 1; i < doors.length; i++) {
      // Five-wide casetas have their door in the middle column, Caseta-musica (7 wide) in column 3,
      // so door-to-door spacing is the half widths plus a gap of 1-2 tiles.
      const spacing = doors[i].x - doors[i - 1].x;
      expect(spacing, `${ROW_A[i - 1]} -> ${ROW_A[i]}`).toBeGreaterThanOrEqual(6);
      expect(spacing, `${ROW_A[i - 1]} -> ${ROW_A[i]}`).toBeLessThanOrEqual(8);
    }
  });

  it('brings the second row up to a few tiles below the top street', () => {
    for (const id of ROW_B) expect(building(id).tile.y, id).toBe(ROW_B_DOOR_Y);
    expect(ROW_B_DOOR_Y - ROW_A_DOOR_Y).toBeLessThanOrEqual(8);
  });

  it('sets every caseta on its door tile with a walkable approach in front', () => {
    const collision = layer('collision');
    const decor = layer('decor');
    for (const id of [...ROW_A, ...ROW_B]) {
      const { x, y } = building(id).tile;
      expect(at(collision, x, y), id).not.toBe(0);
      expect(at(decor, x, y), `${id} facade`).not.toBe(0);
      expect(at(collision, x, y + 1), `${id} approach`).toBe(0);
    }
  });

  it('puts the Contact post box and the welcome sign on the avenue edge, a few steps from the spawn', () => {
    const dist = stepsFromSpawn();
    const post = building('contact').tile;
    const welcome = objects.find((o) => o.type === 'sign' && o.id === 'welcome-sign')!.tile;
    // One tile off the walking path, with the avenue tile beside each one walkable and reachable.
    expect(AVENUE_X, 'post box faces the avenue').toContain(post.x - 1);
    expect(AVENUE_X, 'welcome sign faces the avenue').toContain(welcome.x + 1);
    expect(stepsTo(dist, post.x, post.y), 'steps to the post box').toBeLessThanOrEqual(6);
    expect(stepsTo(dist, welcome.x, welcome.y), 'steps to the welcome sign').toBeLessThanOrEqual(6);
  });

  it('draws the CV project casetas from feria-projects', () => {
    const decor = layer('decor');
    for (const id of ['secure-voting', 'action-detection', 'volunteer-pwa']) {
      const { x, y } = building(id).tile;
      expect(at(decor, x, y), id).toBeGreaterThanOrEqual(feria.tilesets[2].firstgid);
    }
  });

  it('keeps the avenue walkable end to end, from the portada up to the top street', () => {
    const collision = layer('collision');
    const spawn = spawnTile();
    expect(AVENUE_X).toContain(spawn.x);
    for (let y = ROW_A_DOOR_Y + 1; y < feria.height - 1; y++) for (const x of AVENUE_X) expect(at(collision, x, y), `${x},${y}`).toBe(0);
  });

  it('blocks the perimeter fence all the way round', () => {
    const collision = layer('collision');
    for (let x = 0; x < feria.width; x++) {
      expect(at(collision, x, 0), `${x},0`).not.toBe(0);
      expect(at(collision, x, feria.height - 1), `${x},bottom`).not.toBe(0);
    }
    for (let y = 0; y < feria.height; y++) {
      expect(at(collision, 0, y), `0,${y}`).not.toBe(0);
      expect(at(collision, feria.width - 1, y), `right,${y}`).not.toBe(0);
    }
  });

  it('blocks every NPC and sign tile', () => {
    const collision = layer('collision');
    for (const o of objects.filter((o) => o.type === 'npc' || o.type === 'sign')) expect(at(collision, o.tile.x, o.tile.y), o.id).not.toBe(0);
  });

  it('keeps bunting and garlands off the doors and the name tags above them', () => {
    const overhead = layer('overhead');
    for (const o of objects.filter((o) => o.type === 'building')) {
      for (const dy of [0, -1]) expect(at(overhead, o.tile.x, o.tile.y + dy), `${o.id} ${dy}`).toBe(0);
    }
  });

  it('keeps the name tags of neighbouring buildings from overlapping', () => {
    // GridScene draws each tag in 8px monospace (about 4.8px a character) plus 2px padding a side,
    // centred on the door tile; doors on the same row must leave room for both half widths.
    const tagWidth = (id: string) => projects[id].title.length * 4.8 + 4;
    for (const row of [ROW_A, ROW_B]) {
      for (let i = 1; i < row.length; i++) {
        const gap = (building(row[i]).tile.x - building(row[i - 1]).tile.x) * TILE_SIZE;
        expect(gap, `${row[i - 1]} / ${row[i]}`).toBeGreaterThanOrEqual((tagWidth(row[i - 1]) + tagWidth(row[i])) / 2 + 4);
      }
    }
  });

  it('keeps every NPC line to three dialogue pages at most', () => {
    // DialogueBox wraps at 28 characters and shows 3 lines per page.
    for (const npc of objects.filter((o) => o.type === 'npc')) expect(paginate(npc.text ?? '', 28, 3).length, npc.id).toBeLessThanOrEqual(3);
  });

  it('has the flamenca point out the open CV casetas as well as the ones still being built', () => {
    const text = objects.find((o) => o.type === 'npc' && o.id === 'flamenca')?.text ?? '';
    expect(text).toMatch(/Caseta-musica/);
    expect(text).toMatch(/town hall/i);
    expect(text).toMatch(/football/i);
    expect(text).toMatch(/volunteer/i);
    expect(text).toMatch(/green ones are still being built/i);
  });

  it('has the portada spawn', () => {
    expect(objects.some((o) => o.type === 'spawn' && o.id === 'portada')).toBe(true);
  });

  it('only uses tile gids covered by its tilesets (base, feria-custom and feria-projects)', () => {
    expect(feria.tilesets.map((t) => t.name)).toEqual(['feria', 'feria-custom', 'feria-projects']);
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
