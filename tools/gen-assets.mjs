// Generates the placeholder pixel art (tileset + character sprites) as PNGs, with no dependencies.
// Run: node tools/gen-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { COLUMNS, PIECES, ROWS, T, TILE } from './tileset-layout.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- PNG encoding ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Drawing ----------
function parseColor(c) {
  const hex = c.replace('#', '');
  const v = parseInt(hex.slice(0, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, a];
}

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4);
    this.ox = 0;
    this.oy = 0;
  }
  /** Sets the drawing origin (all coordinates are relative to it). */
  at(ox, oy) {
    this.ox = ox;
    this.oy = oy;
    return this;
  }
  px(x, y, color) {
    x = Math.round(x) + this.ox;
    y = Math.round(y) + this.oy;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = parseColor(color);
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }
  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, color);
  }
  hline(x, y, w, color) {
    this.rect(x, y, w, 1, color);
  }
  vline(x, y, h, color) {
    this.rect(x, y, 1, h, color);
  }
  /** Draws ASCII art; '.' is transparent. */
  sprite(x, y, rows, palette, mirror = false) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === '.' || !palette[ch]) return;
        this.px(mirror ? x + row.length - 1 - i : x + i, y + j, palette[ch]);
      });
    });
  }
  png() {
    return encodePng(this.w, this.h, this.data);
  }
}

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Palette ----------
const C = {
  albero: '#d6a24a',
  alberoLight: '#e6b968',
  alberoDark: '#b8873a',
  pebble: '#a87a34',
  outline: '#2e1d12',
  white: '#f6f1e4',
  whiteShade: '#d9cfbb',
  red: '#c8302c',
  redDark: '#8f1f1c',
  green: '#2f8a4a',
  greenDark: '#1d5c31',
  yellow: '#f2c230',
  bulb: '#ffe066',
  blue: '#2f5fa8',
  wood: '#9a6532',
  woodMid: '#8c5a2b',
  woodDark: '#5e3a1a',
  woodLight: '#b07a40',
  terracotta: '#b24d2a',
  terracottaDark: '#7e3219',
  wall: '#f1ebdc',
  void: '#1b1209',
};

const sheet = new Canvas(COLUMNS * TILE, ROWS * TILE);
const tileAt = (index) => sheet.at((index % COLUMNS) * TILE, Math.floor(index / COLUMNS) * TILE);

// ---------- Ground ----------
function albero(index, seed, pebbles) {
  const c = tileAt(index);
  const r = rng(seed);
  c.rect(0, 0, 16, 16, C.albero);
  for (let i = 0; i < 22; i++) c.px(r() * 16, r() * 16, r() < 0.6 ? C.alberoLight : C.alberoDark);
  for (let i = 0; i < pebbles; i++) {
    const x = Math.floor(r() * 14);
    const y = Math.floor(r() * 14);
    c.rect(x, y, 2, 1, C.pebble);
    c.px(x, y + 1, C.alberoDark);
  }
}
albero(T.ALBERO, 11, 0);
albero(T.ALBERO2, 23, 3);
albero(T.ALBERO3, 37, 1);
{
  const c = tileAt(T.ALBERO3);
  for (let x = 1; x < 15; x += 3) c.px(x, 7, C.alberoDark); // faint rake marks
}

{
  const c = tileAt(T.COBBLE);
  c.rect(0, 0, 16, 16, '#8b8378');
  const stones = [[0, 0, 7, 5], [8, 0, 8, 5], [0, 6, 4, 5], [5, 6, 7, 5], [13, 6, 3, 5], [0, 12, 8, 4], [9, 12, 7, 4]];
  for (const [x, y, w, h] of stones) {
    c.rect(x, y, w - 1, h - 1, '#b3aa9b');
    c.hline(x, y, w - 1, '#cbc3b4');
  }
}

// ---------- Fences ----------
{
  const c = tileAt(T.FENCE_H);
  for (const y of [5, 10]) {
    c.hline(0, y, 16, C.white);
    c.hline(0, y + 1, 16, C.white);
    c.hline(0, y + 2, 16, C.whiteShade);
  }
  for (const x of [2, 10]) {
    c.rect(x, 2, 3, 13, C.white);
    c.vline(x + 2, 2, 13, C.whiteShade);
    c.hline(x, 15, 3, '#00000044');
  }
}
{
  const c = tileAt(T.FENCE_V);
  c.rect(6, 0, 3, 16, C.white);
  c.vline(8, 0, 16, C.whiteShade);
  for (const y of [3, 11]) c.rect(4, y, 7, 3, C.white), c.hline(4, y + 2, 7, C.whiteShade);
}
{
  const c = tileAt(T.FENCE_POST);
  c.rect(4, 2, 8, 12, C.white);
  c.rect(4, 12, 8, 2, C.whiteShade);
  c.rect(5, 1, 6, 2, C.red);
}
{
  const c = tileAt(T.BLOCK);
  c.rect(0, 0, 16, 16, '#ff00ff66');
}

// ---------- Floors and walls ----------
function wood(index, offset) {
  const c = tileAt(index);
  for (let row = 0; row < 4; row++) {
    c.rect(0, row * 4, 16, 4, row % 2 ? C.woodMid : C.wood);
    c.hline(0, row * 4 + 3, 16, C.woodDark);
    c.px((row * 5 + offset) % 16, row * 4 + 1, C.woodLight);
    c.vline((row * 7 + offset) % 16, row * 4, 3, C.woodDark);
  }
}
wood(T.WOOD, 3);
wood(T.WOOD2, 9);
{
  const c = tileAt(T.WALL);
  c.rect(0, 0, 16, 16, C.wall);
  c.rect(0, 0, 16, 3, '#ddd3bf');
  c.hline(0, 3, 16, '#c8bda6');
  const r = rng(5);
  for (let i = 0; i < 6; i++) c.px(r() * 16, 4 + r() * 12, '#e4dccb');
}
{
  const c = tileAt(T.AZULEJO);
  c.rect(0, 0, 16, 16, C.white);
  for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
    c.rect(x, y, 8, 1, C.blue);
    c.rect(x, y, 1, 8, C.blue);
    c.rect(x + 3, y + 2, 2, 4, C.yellow);
    c.rect(x + 2, y + 3, 4, 2, C.yellow);
    c.px(x + 3, y + 3, C.blue);
    c.px(x + 4, y + 4, C.blue);
  }
  c.hline(0, 0, 16, '#c79a2e');
}
{
  const c = tileAt(T.STAGE);
  for (let row = 0; row < 3; row++) {
    c.rect(0, row * 4, 16, 4, row % 2 ? '#7a3f22' : '#8a4a28');
    c.hline(0, row * 4 + 3, 16, '#4a2414');
  }
  c.rect(0, 12, 16, 4, '#4a2414');
  c.hline(0, 12, 16, '#a0603a');
}
{
  const c = tileAt(T.RUG);
  c.rect(0, 0, 16, 16, '#a82a2a');
  c.rect(1, 1, 14, 14, C.yellow);
  c.rect(2, 2, 12, 12, '#a82a2a');
  c.rect(6, 6, 4, 4, C.yellow);
  c.px(7, 7, '#a82a2a');
  c.px(8, 8, '#a82a2a');
}
{
  const c = tileAt(T.MAT);
  c.rect(0, 0, 16, 16, '#3a2a1c');
  c.rect(2, 2, 12, 12, '#9a2a24');
  c.rect(3, 3, 10, 10, '#b8402e');
  // arrow pointing down: "way out"
  c.rect(7, 4, 2, 5, C.yellow);
  c.rect(5, 8, 6, 1, C.yellow);
  c.rect(6, 9, 4, 1, C.yellow);
  c.rect(7, 10, 2, 1, C.yellow);
}
{
  const c = tileAt(T.VOID);
  c.rect(0, 0, 16, 16, C.void);
}

// ---------- Overworld props (transparent background) ----------
function farolillo(c, x, y, color) {
  c.rect(x + 1, y, 2, 1, C.outline);
  c.rect(x, y + 1, 4, 4, color);
  c.px(x + 1, y + 2, C.white);
  c.px(x + 3, y + 4, C.white);
  c.rect(x + 1, y + 5, 2, 1, C.outline);
}
{
  const c = tileAt(T.LAMPPOST);
  c.rect(7, 6, 2, 9, '#2b2b2b');
  c.rect(5, 14, 6, 2, '#2b2b2b');
  c.rect(4, 0, 8, 1, C.outline);
  c.rect(3, 1, 10, 6, C.red);
  for (const [x, y] of [[5, 2], [9, 3], [6, 5], [11, 5], [4, 4]]) c.px(x, y, C.white);
  c.rect(4, 7, 8, 1, C.outline);
}
{
  const c = tileAt(T.POT);
  c.rect(4, 4, 8, 6, '#3d8a3a');
  c.rect(3, 6, 10, 3, '#3d8a3a');
  for (const [x, y] of [[5, 4], [9, 5], [6, 7], [11, 7], [4, 7], [8, 3]]) c.px(x, y, '#d8283a'), c.px(x + 1, y, '#f04a5a');
  c.rect(4, 10, 8, 1, '#8a3a1c');
  c.rect(4, 11, 8, 4, '#b5532e');
  c.rect(5, 15, 6, 1, '#8a3a1c');
  c.vline(5, 11, 4, '#cf6a3e');
}
{
  const c = tileAt(T.SIGN);
  c.rect(7, 9, 2, 7, C.woodDark);
  c.rect(1, 2, 14, 8, C.outline);
  c.rect(2, 3, 12, 6, C.woodLight);
  c.hline(4, 5, 8, C.woodDark);
  c.hline(4, 7, 6, C.woodDark);
}
{
  const c = tileAt(T.POSTBOX);
  c.rect(4, 1, 8, 1, C.outline);
  c.rect(3, 2, 10, 11, C.outline);
  c.rect(4, 2, 8, 10, C.yellow);
  c.rect(4, 2, 8, 2, '#f7d860');
  c.rect(5, 5, 6, 1, C.outline);
  c.rect(6, 8, 4, 2, '#1f4fa0');
  c.rect(5, 13, 2, 3, '#4a4a4a');
  c.rect(9, 13, 2, 3, '#4a4a4a');
}
{
  const c = tileAt(T.LANTERNS);
  for (let x = 0; x < 16; x++) c.px(x, 2 + Math.round(Math.sin((x / 15) * Math.PI) * 2), C.outline);
  farolillo(c, 2, 4, C.red);
  farolillo(c, 10, 4, C.green);
}
{
  const c = tileAt(T.BUNTING);
  c.hline(0, 2, 16, C.outline);
  const colors = [C.red, C.white, C.green, C.yellow];
  for (let i = 0; i < 4; i++) {
    const x = i * 4;
    for (let j = 0; j < 4; j++) c.hline(x + Math.floor(j / 2), 3 + j, 4 - Math.floor(j / 2) * 2, colors[i]);
  }
}

// ---------- Interior furniture (transparent background) ----------
{
  const c = tileAt(T.SHELF_T);
  c.rect(1, 0, 14, 16, C.woodDark);
  c.rect(2, 1, 12, 15, '#3b2412');
  const books = ['#c8302c', '#2f5fa8', '#f2c230', '#2f8a4a', '#e8e0d0', '#7a3fa0'];
  for (let i = 0; i < 6; i++) c.rect(2 + i * 2, 3 + (i % 2), 2, 5 - (i % 2), books[i]);
  c.rect(2, 8, 12, 1, C.wood);
  for (let i = 0; i < 6; i++) c.rect(2 + i * 2, 10 + (i % 3 === 0 ? 1 : 0), 2, 5 - (i % 3 === 0 ? 1 : 0), books[(i + 3) % 6]);
  c.rect(2, 15, 12, 1, C.wood);
}
{
  const c = tileAt(T.SHELF_B);
  c.rect(1, 0, 14, 15, C.woodDark);
  c.rect(2, 0, 12, 13, '#3b2412');
  const books = ['#2f8a4a', '#c8302c', '#e8e0d0', '#2f5fa8', '#f2c230', '#c8302c'];
  for (let i = 0; i < 6; i++) c.rect(2 + i * 2, 1 + (i % 2), 2, 5 - (i % 2), books[i]);
  c.rect(2, 6, 12, 1, C.wood);
  c.rect(3, 8, 5, 4, '#e8e0d0'); // a framed diploma
  c.rect(4, 9, 3, 2, '#c8b890');
  c.rect(1, 13, 14, 2, C.wood);
  c.hline(1, 15, 14, '#00000055');
}
function deskBase(c) {
  c.rect(0, 5, 16, 5, C.woodLight);
  c.hline(0, 5, 16, '#c99258');
  c.rect(0, 10, 16, 5, C.woodMid);
  c.hline(0, 15, 16, '#00000055');
}
{
  const c = tileAt(T.DESK_L);
  deskBase(c);
  c.vline(0, 5, 10, C.woodDark);
  c.rect(2, 11, 6, 3, C.woodDark);
  c.rect(4, 12, 2, 1, C.yellow);
  c.rect(4, 3, 7, 5, '#f4f0e0'); // papers
  c.hline(5, 5, 5, '#9a9080');
  c.rect(12, 5, 2, 2, '#1e1a2a'); // inkpot
}
{
  const c = tileAt(T.DESK_R);
  deskBase(c);
  c.vline(15, 5, 10, C.woodDark);
  c.rect(2, 2, 10, 6, '#3a3a44'); // laptop
  c.rect(3, 3, 8, 4, '#6ec0e8');
  c.hline(4, 4, 4, '#ffffff');
  c.rect(1, 8, 12, 2, '#55555f');
}
{
  const c = tileAt(T.JUKE_T);
  c.rect(3, 2, 10, 14, C.outline);
  c.rect(4, 1, 8, 1, C.outline);
  c.rect(4, 3, 8, 13, '#e04aa0');
  c.rect(5, 2, 6, 1, '#e04aa0');
  c.rect(5, 4, 6, 12, C.yellow);
  c.rect(6, 5, 4, 11, '#5fd0e8');
  c.rect(7, 7, 2, 2, '#ffffff');
}
{
  const c = tileAt(T.JUKE_B);
  c.rect(3, 0, 10, 15, C.outline);
  c.rect(4, 0, 8, 14, C.wood);
  c.rect(4, 0, 1, 14, '#e04aa0');
  c.rect(11, 0, 1, 14, '#e04aa0');
  c.rect(5, 1, 6, 3, '#2a2a36');
  for (let x = 5; x < 11; x += 2) c.px(x, 2, C.bulb);
  c.rect(5, 6, 6, 6, '#3a2418');
  for (let y = 7; y < 12; y += 2) for (let x = 6; x < 11; x += 2) c.px(x, y, '#8a6a4a');
  c.hline(3, 15, 10, '#00000055');
}
{
  const c = tileAt(T.CHAIR);
  c.rect(4, 1, 2, 13, C.woodDark);
  c.rect(10, 1, 2, 13, C.woodDark);
  c.rect(4, 2, 8, 1, C.woodDark);
  c.rect(4, 5, 8, 1, C.woodDark);
  c.rect(3, 8, 10, 4, '#d9b45a');
  c.hline(3, 9, 10, '#c09840');
  c.hline(3, 11, 10, '#c09840');
}
{
  const c = tileAt(T.TABLE);
  const r = [5, 3, 2, 1, 1, 0, 0, 0, 0, 0, 1, 1, 2];
  r.forEach((inset, y) => c.rect(inset, y + 1, 16 - inset * 2, 1, C.white));
  for (const [x, y] of [[4, 4], [9, 3], [12, 7], [6, 9], [3, 7], [10, 10]]) c.rect(x, y, 2, 2, C.red);
  c.rect(2, 14, 12, 2, '#00000044');
  c.rect(7, 13, 2, 2, C.woodDark);
}
{
  const c = tileAt(T.GUITAR);
  c.rect(7, 0, 2, 7, C.woodDark);
  c.rect(6, 0, 4, 2, '#3b2412');
  c.rect(4, 7, 8, 4, '#c8863a');
  c.rect(3, 10, 10, 5, '#c8863a');
  c.rect(5, 6, 6, 1, '#c8863a');
  c.rect(7, 9, 2, 2, '#3b2412');
  c.rect(6, 13, 4, 1, C.woodDark);
}
{
  const c = tileAt(T.SPEAKER);
  c.rect(3, 1, 10, 14, '#202024');
  c.rect(5, 3, 6, 4, '#4a4a52');
  c.rect(6, 4, 4, 2, '#77777f');
  c.rect(4, 8, 8, 6, '#4a4a52');
  c.rect(6, 10, 4, 2, '#77777f');
  c.hline(3, 15, 10, '#00000055');
}

// ---------- Casetas ----------
function caseta(piece, color, dark) {
  const c = sheet.at(piece.col * TILE, piece.row * TILE);
  const W = piece.w * TILE;
  const H = piece.h * TILE;
  const mid = W / 2;
  // Striped canvas front (lona) with a pediment on top.
  for (let x = 0; x < W; x++) {
    const top = 1 + Math.floor(Math.abs(x - mid + 0.5) / 7);
    const stripe = Math.floor(x / 5) % 2 === 0 ? color : C.white;
    c.vline(x, top, 48 - top, stripe);
    c.px(x, top, C.outline);
  }
  // Shading under the pediment.
  for (let x = 0; x < W; x++) c.px(x, 14, Math.floor(x / 5) % 2 === 0 ? dark : C.whiteShade);
  // Scalloped valance.
  c.rect(0, 10, W, 4, C.white);
  for (let x = 0; x < W; x++) {
    const d = (x % 8) - 3.5;
    if (Math.abs(d) < 3) c.px(x, 14, color), c.px(x, 15, Math.abs(d) < 2 ? color : C.white);
  }
  c.hline(0, 10, W, dark);
  // Name board on the pediment.
  c.rect(mid - 12, 3, 24, 6, C.outline);
  c.rect(mid - 11, 4, 22, 4, C.white);
  c.hline(mid - 8, 5, 16, dark);
  // Farolillos hanging from the valance.
  const lantern = [C.red, C.green, C.yellow, C.white];
  for (let i = 0; i < 7; i++) farolillo(c, 4 + i * 11, 17, lantern[i % 4] === color ? C.yellow : lantern[i % 4]);
  // Lower front: dark interior behind a white railing.
  c.rect(0, 46, W, 18, '#4a2f1c');
  c.rect(0, 46, W, 3, C.white);
  c.hline(0, 49, W, C.whiteShade);
  for (let x = 2; x < W; x += 5) c.rect(x, 49, 2, 11, C.white);
  c.rect(0, 59, W, 5, color);
  c.hline(0, 59, W, dark);
  // Door opening (local column 2), framed by tied-back curtains.
  const dx = 2 * TILE;
  c.rect(dx, 36, TILE, H - 36, '#3a2414');
  for (let y = 38; y < H; y += 4) c.hline(dx + 1, y, TILE - 2, '#5e3a1a');
  for (let j = 0; j < 20; j++) {
    const w = Math.max(1, 5 - Math.floor(j / 4));
    c.hline(dx - 1, 30 + j, w, color);
    c.hline(dx + TILE + 1 - w, 30 + j, w, color);
  }
  c.hline(dx - 2, 30, TILE + 4, dark);
  // Outline.
  c.vline(0, 6, H - 6, C.outline);
  c.vline(W - 1, 6, H - 6, C.outline);
  c.hline(0, H - 1, W, C.outline);
}
caseta(PIECES.casetaRed, C.red, C.redDark);
caseta(PIECES.casetaGreen, C.green, C.greenDark);

// ---------- About house ----------
{
  const p = PIECES.house;
  const c = sheet.at(p.col * TILE, p.row * TILE);
  const W = p.w * TILE;
  // Terracotta roof.
  c.rect(0, 2, W, 28, C.terracotta);
  for (let y = 4; y < 30; y += 4) c.hline(0, y, W, C.terracottaDark);
  for (let y = 2; y < 30; y += 4) for (let x = (y / 4) % 2 ? 2 : 5; x < W; x += 6) c.vline(x, y, 2, '#d0683e');
  c.hline(0, 2, W, C.outline);
  c.rect(0, 29, W, 3, '#5a2412');
  // Whitewashed wall with ochre trim.
  c.rect(0, 32, W, 32, C.wall);
  c.rect(0, 32, 3, 32, C.albero);
  c.rect(W - 3, 32, 3, 32, C.albero);
  c.rect(0, 58, W, 6, C.blue);
  for (let x = 1; x < W; x += 4) c.rect(x, 59, 2, 2, C.yellow);
  // Windows with iron grilles and geraniums.
  for (const wx of [18, 50]) {
    c.rect(wx - 1, 35, 14, 15, C.albero);
    c.rect(wx, 36, 12, 13, '#2a3550');
    c.hline(wx + 1, 37, 4, '#5a7090');
    for (let x = wx + 1; x < wx + 12; x += 3) c.vline(x, 36, 13, '#111111');
    c.rect(wx - 1, 49, 14, 2, '#8a3a1c');
    for (let x = wx; x < wx + 12; x += 3) c.px(x, 48, '#d8283a'), c.px(x + 1, 48, '#3d8a3a');
  }
  // Door (local column 2).
  const dx = 2 * TILE;
  c.rect(dx + 1, 38, 14, 26, C.albero);
  c.rect(dx + 3, 40, 10, 24, '#2f6e4a');
  c.vline(dx + 8, 40, 24, '#1f4e34');
  c.px(dx + 10, 52, C.yellow);
  c.px(dx + 6, 52, C.yellow);
  c.vline(0, 2, 62, C.outline);
  c.vline(W - 1, 2, 62, C.outline);
}

// ---------- Portada (the feria gate) ----------
{
  const p = PIECES.portada;
  const c = sheet.at(p.col * TILE, p.row * TILE);
  const W = p.w * TILE;
  const H = p.h * TILE;
  const bulbs = (x0, y0, w, h, step) => {
    for (let y = y0; y < y0 + h; y += step) for (let x = x0; x < x0 + w; x += step) c.px(x, y, C.bulb);
  };
  for (const tx of [0, 64]) {
    // Tower body.
    c.rect(tx + 2, 10, 28, H - 10, C.outline);
    c.rect(tx + 3, 11, 26, H - 12, C.white);
    c.rect(tx + 7, 18, 18, 30, C.red);
    c.rect(tx + 9, 20, 14, 26, C.white);
    bulbs(tx + 5, 13, 24, 48, 4);
    c.rect(tx + 12, 26, 8, 12, C.green);
    c.rect(tx + 14, 24, 4, 2, C.green);
    // Pinnacle.
    for (let j = 0; j < 10; j++) c.hline(tx + 16 - Math.floor(j * 1.3), j + 1, Math.floor(j * 2.6) + 1, j % 3 === 0 ? C.bulb : C.white);
    c.px(tx + 16, 0, C.bulb);
    c.rect(tx + 3, H - 4, 26, 3, C.whiteShade);
  }
  // Arch spanning the opening (local columns 2 and 3).
  for (let x = 30; x < 66; x++) {
    const t = (x - 47.5) / 18;
    const under = 26 - Math.round((1 - t * t) * 12);
    c.vline(x, 4, under - 4, C.white);
    c.px(x, 4, C.outline);
    c.px(x, under, C.outline);
    c.px(x, under - 1, C.red);
    if (x % 3 === 0) c.px(x, 7, C.bulb), c.px(x, under - 3, C.bulb);
  }
  c.rect(42, 6, 12, 5, C.green);
  c.rect(44, 7, 8, 3, C.bulb);
}

// ---------- Characters ----------
const PLAYER_PAL = {
  K: '#1e1a1a', H: '#3b2416', S: '#e8b48a', E: '#1e1a1a', W: '#f4f0e8', R: '#c8302c', G: '#5f5f70', B: '#3a2a20',
};
const head = {
  down: [
    '................',
    '.....KKKKKK.....',
    '...KKKKKKKKKK...',
    '....HHHHHHHH....',
    '....HSSSSSSH....',
    '....SSESSESS....',
    '....SSSSSSSS....',
    '.....SSSSSS.....',
  ],
  up: [
    '................',
    '.....KKKKKK.....',
    '...KKKKKKKKKK...',
    '....HHHHHHHH....',
    '....HHHHHHHH....',
    '....HHHHHHHH....',
    '....SHHHHHHS....',
    '.....SSSSSS.....',
  ],
  left: [
    '................',
    '.....KKKKKK.....',
    '...KKKKKKKKKK...',
    '.....HHHHHHH....',
    '....SSSSSHHH....',
    '....SESSSSHH....',
    '....SSSSSSSH....',
    '......SSSSS.....',
  ],
};
const body = {
  down: ['....KKWWWWKK....', '...KKKWRRWKKK...', '...SKKWWWWKKS...', '....KRRRRRRK....', '....GGGGGGGG....'],
  up: ['....KKKKKKKK....', '...KKKKKKKKKK...', '...SKKKKKKKKS...', '....KRRRRRRK....', '....GGGGGGGG....'],
  left: ['......KKWKK.....', '......KKWKK.....', '.....SKKKKK.....', '......RRRRR.....', '......GGGGG.....'],
};
const legs = {
  front: [
    ['....GGG..GGG....', '....GGG..GGG....', '....BBB..BBB....'],
    ['....GGG..GGG....', '....GGG..BBB....', '....BBB.........'],
    ['....GGG..GGG....', '....BBB..GGG....', '.........BBB....'],
  ],
  side: [
    ['......GGGGG.....', '......GG.GG.....', '......BB.BB.....'],
    ['.....GGG.GG.....', '.....GG...GG....', '....BB.....BB...'],
    ['......GGGG......', '.....GG..GG.....', '.....BB..BB.....'],
  ],
};
const player = new Canvas(3 * TILE, 4 * TILE);
const playerRows = [['down', false], ['left', false], ['left', true], ['up', false]];
playerRows.forEach(([dir, mirror], row) => {
  for (let f = 0; f < 3; f++) {
    const l = dir === 'left' ? legs.side[f] : legs.front[f];
    player.at(f * TILE, row * TILE).sprite(0, 0, [...head[dir], ...body[dir], ...l], PLAYER_PAL, mirror);
  }
});

const NPC_PAL = { H: '#24160e', F: '#e8283a', S: '#e0a87e', E: '#1e1a1a', D: '#c8302c', w: '#f6f1e4' };
const dress = [
  '....DDDDDDDD....',
  '...SDwDDDDwDS...',
  '....DDDDwDDD....',
  '....DwDDDDDD....',
  '...DDDDDwDDDD...',
  '..DwDDDDDDDwDD..',
  '.DDDDDwDDDDDDDD.',
  '.wDwDwDwDwDwDwD.',
];
const npcHeads = {
  down: ['................', '......HHHHF.....', '.....HHHHHFF....', '....HHHHHHHH....', '....HSSSSSSH....', '....HSESSESH....', '....HSSSSSSH....', '.....SSSSSS.....'],
  up: ['................', '.....FHHHH......', '....FFHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '.....SSSSSS.....'],
  left: ['................', '......HHHHF.....', '.....HHHHHFF....', '....HHHHHHHH....', '....SSSSSHHH....', '....SESSSSHH....', '....SSSSSSHH....', '.....SSSSS......'],
};
const npc = new Canvas(4 * TILE, TILE);
[['down', false], ['left', false], ['left', true], ['up', false]].forEach(([dir, mirror], i) => {
  npc.at(i * TILE, 0).sprite(0, 0, [...npcHeads[dir], ...dress], NPC_PAL, mirror);
});

// ---------- Write files ----------
function save(rel, canvas) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, canvas.png());
  console.log('wrote', rel);
}
save('public/assets/tilesets/feria.png', sheet);
save('public/assets/sprites/player.png', player);
save('public/assets/sprites/npc.png', npc);
