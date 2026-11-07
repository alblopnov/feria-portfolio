// Generates the Tiled-format JSON maps (orthogonal, embedded tileset) loaded by Phaser.
// Run: node tools/gen-maps.mjs   (after tools/gen-assets.mjs has drawn the tileset)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLUMNS, PIECES, ROWS, T, TILE, pieceTile } from './tileset-layout.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A map under construction: tile layers hold local tile indices (-1 = empty). */
class MapBuilder {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    const empty = () => new Array(width * height).fill(-1);
    this.ground = empty();
    this.decor = empty();
    this.collision = empty();
    this.objects = [];
  }
  set(layer, x, y, tile) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) throw new Error(`tile ${x},${y} outside map`);
    this[layer][y * this.width + x] = tile;
  }
  fill(layer, x, y, w, h, tile) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(layer, x + i, y + j, typeof tile === 'function' ? tile(x + i, y + j) : tile);
  }
  block(x, y, w = 1, h = 1) {
    this.fill('collision', x, y, w, h, T.BLOCK);
  }
  unblock(x, y) {
    this.set('collision', x, y, -1);
  }
  /** A solid prop on the decor layer. */
  prop(x, y, tile) {
    this.set('decor', x, y, tile);
    this.block(x, y);
  }
  /** A multi-tile piece on the decor layer, fully blocked. */
  piece(piece, x, y) {
    for (let cy = 0; cy < piece.h; cy++) for (let cx = 0; cx < piece.w; cx++) this.set('decor', x + cx, y + cy, pieceTile(piece, cx, cy));
    this.block(x, y, piece.w, piece.h);
  }
  object(type, x, y, props = {}, name = '') {
    this.objects.push({
      id: this.objects.length + 1,
      name,
      type,
      x: x * TILE,
      y: y * TILE,
      width: TILE,
      height: TILE,
      rotation: 0,
      visible: true,
      properties: Object.entries(props).map(([key, value]) => ({ name: key, type: 'string', value })),
    });
  }
  toTiled() {
    const gids = (arr) => arr.map((t) => (t < 0 ? 0 : t + 1));
    const tileLayer = (id, name, data, visible = true) => ({
      id,
      name,
      type: 'tilelayer',
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      opacity: 1,
      visible,
      data: gids(data),
    });
    return {
      compressionlevel: -1,
      type: 'map',
      version: '1.10',
      tiledversion: '1.10.2',
      orientation: 'orthogonal',
      renderorder: 'right-down',
      infinite: false,
      width: this.width,
      height: this.height,
      tilewidth: TILE,
      tileheight: TILE,
      nextlayerid: 5,
      nextobjectid: this.objects.length + 1,
      layers: [
        tileLayer(1, 'ground', this.ground),
        tileLayer(2, 'decor', this.decor),
        tileLayer(3, 'collision', this.collision, false),
        { id: 4, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: this.objects },
      ],
      tilesets: [
        {
          firstgid: 1,
          name: 'feria',
          image: '../tilesets/feria.png',
          imagewidth: COLUMNS * TILE,
          imageheight: ROWS * TILE,
          tilewidth: TILE,
          tileheight: TILE,
          tilecount: COLUMNS * ROWS,
          columns: COLUMNS,
          margin: 0,
          spacing: 0,
        },
      ],
    };
  }
}

// ---------- Overworld: the feria ground ----------
function buildFeria() {
  const m = new MapBuilder(40, 30);
  const r = rng(2026);
  m.fill('ground', 0, 0, 40, 30, () => {
    const v = r();
    return v < 0.75 ? T.ALBERO : v < 0.9 ? T.ALBERO3 : T.ALBERO2;
  });

  // Perimeter fence.
  m.fill('decor', 1, 0, 38, 1, T.FENCE_H);
  m.fill('decor', 1, 29, 38, 1, T.FENCE_H);
  m.fill('decor', 0, 1, 1, 28, T.FENCE_V);
  m.fill('decor', 39, 1, 1, 28, T.FENCE_V);
  for (const [x, y] of [[0, 0], [39, 0], [0, 29], [39, 29]]) m.set('decor', x, y, T.FENCE_POST);
  m.block(0, 0, 40, 1);
  m.block(0, 29, 40, 1);
  m.block(0, 0, 1, 30);
  m.block(39, 0, 1, 30);

  // Farolillo strings and bunting along the top.
  m.fill('decor', 1, 1, 38, 1, T.LANTERNS);
  m.fill('decor', 1, 2, 38, 1, T.BUNTING);

  // Row A: casetas facing south onto the first street. The building object sits on the door tile.
  const casetas = [
    ['ml-classifier', 3, PIECES.casetaGreen],
    ['java-service', 10, PIECES.casetaGreen],
    ['caseta', 25, PIECES.casetaRed],
    ['dashboard', 32, PIECES.casetaGreen],
  ];
  for (const [id, x, piece] of casetas) {
    m.piece(piece, x, 3);
    m.object('building', x + 2, 6, { id });
  }

  // Row B: the About house, a terraza with tables on the left and a cobbled plaza on the right.
  m.piece(PIECES.house, 10, 13);
  m.object('building', 12, 16, { id: 'about' });
  m.prop(9, 16, T.POT);
  m.prop(15, 16, T.POT);
  for (const x of [3, 6]) {
    m.prop(x, 14, T.TABLE);
    m.prop(x - 1, 14, T.CHAIR);
  }
  m.fill('ground', 25, 13, 12, 4, T.COBBLE);
  for (const x of [27, 31, 35]) {
    m.prop(x, 14, T.TABLE);
    m.prop(x - 1, 14, T.CHAIR);
  }
  m.prop(25, 16, T.POT);
  m.prop(36, 16, T.POT);

  // Lampposts along the main avenue (x 17..22).
  for (const y of [11, 20]) {
    m.prop(16, y, T.LAMPPOST);
    m.prop(23, y, T.LAMPPOST);
  }

  // Contact post box beside the avenue, near the gate.
  m.prop(24, 23, T.POSTBOX);
  m.object('building', 24, 23, { id: 'contact' });

  // A welcome sign and a flamenca NPC near the gate.
  m.prop(16, 23, T.SIGN);
  m.object('sign', 16, 23, {
    id: 'welcome-sign',
    text: 'Welcome to the Feria! Each caseta is one of my projects. Walk up to a door and press Z or Enter to look inside.',
  });
  m.block(21, 22);
  m.object('npc', 21, 22, {
    id: 'flamenca',
    text: 'Hola! The red and white caseta up north is Caseta-musica, a jukebox for parties. The green ones are still being built, so come back soon. The post box by the gate is how to reach the author.',
  });

  // Flower pots along the bottom fence, leaving the portada clear.
  for (let x = 2; x < 38; x += 3) if (x < 16 || x > 23) m.prop(x, 28, T.POT);

  // The portada gate; its two middle columns are the walkable opening.
  m.piece(PIECES.portada, 17, 25);
  for (let y = 25; y < 29; y++) {
    m.unblock(19, y);
    m.unblock(20, y);
  }
  m.object('spawn', 19, 27, { id: 'portada' }, 'portada');

  return m;
}

function save(rel, map) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(map.toTiled(), null, 1) + '\n');
  console.log('wrote', rel);
}

save('public/assets/maps/feria.json', buildFeria());
