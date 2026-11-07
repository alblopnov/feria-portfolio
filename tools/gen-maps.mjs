// Generates the Tiled-format JSON maps (orthogonal, embedded tileset) loaded by Phaser.
// Run: node tools/gen-maps.mjs   (after tools/gen-assets.mjs has drawn the tileset)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLUMNS, CPIECES, CT, CUSTOM_COLUMNS, CUSTOM_OFFSET, CUSTOM_ROWS, PIECES, PPIECES, PROJECT_COLUMNS, PROJECT_OFFSET, PROJECT_ROWS, PT, ROWS, T, TILE, pieceTile } from './tileset-layout.mjs';

/** A tile from feria-custom.png, addressed in the maps' shared index space. */
const ct = (index) => CUSTOM_OFFSET + index;
/** A tile from feria-projects.png, addressed in the maps' shared index space. */
const pt = (index) => PROJECT_OFFSET + index;

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
    this.overhead = empty(); // drawn above the player (bunting and garlands over the street)
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
      nextlayerid: 6,
      nextobjectid: this.objects.length + 1,
      layers: [
        tileLayer(1, 'ground', this.ground),
        tileLayer(2, 'decor', this.decor),
        tileLayer(3, 'overhead', this.overhead),
        tileLayer(4, 'collision', this.collision, false),
        { id: 5, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects: this.objects },
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
        {
          firstgid: CUSTOM_OFFSET + 1,
          name: 'feria-custom',
          image: '../tilesets/feria-custom.png',
          imagewidth: CUSTOM_COLUMNS * TILE,
          imageheight: CUSTOM_ROWS * TILE,
          tilewidth: TILE,
          tileheight: TILE,
          tilecount: CUSTOM_COLUMNS * CUSTOM_ROWS,
          columns: CUSTOM_COLUMNS,
          margin: 0,
          spacing: 0,
        },
        {
          firstgid: PROJECT_OFFSET + 1,
          name: 'feria-projects',
          image: '../tilesets/feria-projects.png',
          imagewidth: PROJECT_COLUMNS * TILE,
          imageheight: PROJECT_ROWS * TILE,
          tilewidth: TILE,
          tileheight: TILE,
          tilecount: PROJECT_COLUMNS * PROJECT_ROWS,
          columns: PROJECT_COLUMNS,
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
  // Locked projects are casetas still being built: scaffolding, caution tape, a sign and a cone.
  for (const [id, x] of [['ml-classifier', 3], ['java-service', 10], ['dashboard', 32]]) {
    m.piece(CPIECES.casetaObras, x, 3);
    m.object('building', x + 2, 6, { id });
    m.prop(x + 4, 7, ct(CT.OBRAS_SIGN));
    m.object('sign', x + 4, 7, {
      id: `${id}-works`,
      text: 'UNDER CONSTRUCTION. Hard hats only past the tape! This caseta opens its doors when the project ships.',
    });
    m.prop(x, 7, ct(CT.CONE));
  }
  // Caseta-musica: the one caseta in full feria dress. 7x5 tiles; its entrance (local column 3) is the
  // building tile, and the albero in front of it is lit by the light spilling out.
  m.piece(CPIECES.casetaMusica, 24, 2);
  m.object('building', 27, 6, { id: 'caseta' });
  m.set('ground', 27, 7, ct(CT.GLOW));
  // Secure Voting: a little town hall in the gap between the works and Caseta-musica (5x5 tiles,
  // door in local column 2), with its padlocked ballot box out front.
  m.piece(PPIECES.secureVoting, 17, 2);
  m.object('building', 19, 6, { id: 'secure-voting' });
  m.prop(21, 7, pt(PT.BALLOT_OUT));

  // Bunting and farolillo garlands strung over the street, drawn above the player.
  m.fill('overhead', 1, 8, 38, 1, ct(CT.PENNANTS));
  m.fill('overhead', 17, 11, 6, 1, ct(CT.GARLAND));
  m.fill('overhead', 17, 20, 6, 1, ct(CT.GARLAND));
  m.fill('overhead', 1, 18, 15, 1, ct(CT.PENNANTS));
  m.fill('overhead', 24, 18, 15, 1, ct(CT.PENNANTS));

  // Row B: the About house and a terraza with tables on the left, two CV project casetas on the right.
  m.piece(PIECES.house, 10, 13);
  m.object('building', 12, 16, { id: 'about' });
  m.prop(9, 16, T.POT);
  m.prop(15, 16, T.POT);
  for (const [x, y] of [[3, 14], [6, 14], [3, 16], [6, 16]]) {
    m.prop(x, y, T.TABLE);
    m.prop(x - 1, y, T.CHAIR);
  }
  // Action Detection (a football caseta with a camera on a tripod) and Volunteer PWA (a community
  // caseta with a noticeboard), 5x5 tiles each, doors in local column 2 and lit albero in front.
  m.piece(PPIECES.actionDetection, 26, 12);
  m.object('building', 28, 16, { id: 'action-detection' });
  m.set('ground', 28, 17, ct(CT.GLOW));
  m.prop(25, 16, pt(PT.CAMERA));
  m.piece(PPIECES.volunteerPwa, 32, 12);
  m.object('building', 34, 16, { id: 'volunteer-pwa' });
  m.set('ground', 34, 17, ct(CT.GLOW));
  m.prop(37, 16, pt(PT.NOTICE_OUT));

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
  // The Credits sign: every asset in the game is original and generated by the scripts in tools/.
  m.piece(CPIECES.creditsSign, 12, 23);
  for (const x of [12, 13]) {
    m.object('sign', x, 23, {
      id: 'credits',
      text: 'CREDITS. Every tile, sprite, sign and sound in this feria is original, made by the Node scripts in tools/ (gen-assets, gen-maps, gen-audio). There are no third-party assets. Built with Phaser 3, TypeScript and Vite. Full list in CREDITS.md.',
    });
  }
  m.block(21, 22);
  m.object('npc', 21, 22, {
    id: 'flamenca',
    text: 'Hola! The red and white caseta up north is Caseta-musica, a jukebox for parties. The green ones are still being built, so come back soon. The post box by the gate is how to reach the author.',
  });

  // Two more feriantes with tips and hints about what's coming.
  m.block(8, 9);
  m.object('npc', 8, 9, {
    id: 'feriante',
    text: "Those green casetas behind the tape? One will be an ML classifier, one a Java service, and the far one a dashboard for everything running in Docker. They open when they're ready.",
  });
  m.block(30, 20);
  m.object('npc', 30, 20, {
    id: 'senor',
    text: 'Explore everything: walk up to doors, signs and people and press Z (or tap A). The blue-tiled house is the author\'s, the jukebox in the red caseta tells its story, and the post box by the gate has the contact links.',
  });

  // A small noria (ferris wheel) at the far end of the ground: decorative, fenced off by collision.
  m.piece(CPIECES.noria, 32, 21);
  m.object('sign', 34, 24, {
    id: 'noria',
    text: 'La noria. It is closed tonight, but it looks lovely from down here.',
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

// ---------- Interiors ----------
/** A room: two wall rows on top (whitewash + azulejo), wooden floor, void around, exit gap at the bottom. */
function room(width, height, exitX) {
  const m = new MapBuilder(width, height);
  m.fill('ground', 0, 0, width, height, T.VOID);
  m.fill('ground', 1, 0, width - 2, 1, T.WALL);
  m.fill('ground', 1, 1, width - 2, 1, T.AZULEJO);
  m.fill('ground', 1, 2, width - 2, height - 3, (x, y) => ((x + y) % 3 === 0 ? T.WOOD2 : T.WOOD));
  m.block(0, 0, width, 2);
  m.block(0, 0, 1, height);
  m.block(width - 1, 0, 1, height);
  m.block(0, height - 1, width, 1);
  m.set('ground', exitX, height - 1, T.MAT);
  m.unblock(exitX, height - 1);
  m.object('exit', exitX, height - 1, { id: 'exit' });
  m.object('spawn', exitX, height - 2, { id: 'entry' }, 'entry');
  return m;
}

function buildCasetaInterior() {
  const m = room(14, 10, 7);
  m.fill('decor', 1, 1, 12, 1, T.LANTERNS);
  // Stage with a guitar and two speakers.
  m.fill('ground', 2, 2, 5, 2, T.STAGE);
  m.prop(2, 2, T.SPEAKER);
  m.prop(6, 2, T.SPEAKER);
  m.prop(4, 2, T.GUITAR);
  // The jukebox: interacting with it shows the Caseta-musica project card.
  m.prop(10, 2, T.JUKE_T);
  m.prop(10, 3, T.JUKE_B);
  m.object('jukebox', 10, 3, { id: 'caseta' });
  // Tables and chairs.
  for (const [x, y] of [[3, 6], [10, 6]]) {
    m.prop(x, y, T.TABLE);
    m.prop(x - 1, y, T.CHAIR);
    m.prop(x + 1, y, T.CHAIR);
  }
  m.set('ground', 7, 5, T.RUG);
  return m;
}

function buildAboutInterior() {
  const m = room(12, 9, 6);
  // Bookshelf (skills) against the back wall.
  for (const x of [2, 3]) {
    m.prop(x, 1, T.SHELF_T);
    m.prop(x, 2, T.SHELF_B);
    m.object('bookshelf', x, 2, { id: 'about' });
  }
  // Desk (the author's story).
  m.prop(7, 3, T.DESK_L);
  m.prop(8, 3, T.DESK_R);
  m.object('desk', 7, 3, { id: 'about' });
  m.object('desk', 8, 3, { id: 'about' });
  m.prop(1, 2, T.POT);
  m.prop(10, 2, T.POT);
  m.fill('ground', 5, 5, 2, 1, T.RUG);
  return m;
}

/** Action Detection: a commentary booth. The big screen (the exhibit) shows a pitch with detection boxes. */
function buildActionDetectionInterior() {
  const m = room(12, 9, 6);
  m.fill('ground', 2, 2, 8, 3, pt(PT.TURF));
  m.piece(PPIECES.screen, 4, 1);
  m.object('exhibit', 5, 2, { id: 'action-detection' });
  m.prop(2, 2, T.SPEAKER);
  m.prop(8, 2, T.SPEAKER);
  // The commentary desk faces the screen: two microphones, notes and headphones.
  m.prop(3, 5, pt(PT.MIC));
  m.prop(4, 5, pt(PT.COMM_DESK));
  m.prop(5, 5, pt(PT.MIC));
  m.prop(3, 6, T.CHAIR);
  m.prop(5, 6, T.CHAIR);
  m.prop(1, 2, T.POT);
  m.prop(10, 2, T.POT);
  return m;
}

/** Volunteer PWA: a community room. The noticeboard of task cards is the exhibit; a sign-up table beside it. */
function buildVolunteerInterior() {
  const m = room(12, 9, 6);
  m.piece(PPIECES.noticeBoard, 4, 1);
  m.object('exhibit', 5, 2, { id: 'volunteer-pwa' });
  m.prop(8, 4, pt(PT.SIGNUP_L));
  m.prop(9, 4, pt(PT.SIGNUP_R));
  m.prop(8, 3, T.CHAIR);
  m.prop(9, 3, T.CHAIR);
  m.prop(1, 2, pt(PT.BOXES));
  m.prop(2, 2, pt(PT.BOXES));
  m.prop(1, 6, pt(PT.BOXES));
  m.prop(10, 2, T.POT);
  m.fill('ground', 5, 5, 2, 1, T.RUG);
  return m;
}

/** Secure Voting: a town hall chamber. The padlocked ballot box is the exhibit, under the live results board. */
function buildSecureVotingInterior() {
  const m = room(12, 9, 6);
  m.fill('ground', 6, 2, 1, 6, pt(PT.CARPET));
  m.piece(PPIECES.resultsBoard, 4, 1);
  m.prop(6, 4, pt(PPIECES.ballotBox.row * PROJECT_COLUMNS + PPIECES.ballotBox.col));
  m.prop(6, 5, pt((PPIECES.ballotBox.row + 1) * PROJECT_COLUMNS + PPIECES.ballotBox.col));
  m.object('exhibit', 6, 5, { id: 'secure-voting' });
  for (const x of [1, 2, 9, 10]) m.prop(x, 2, pt(PT.BOOTH));
  m.prop(1, 6, T.POT);
  m.prop(10, 6, T.POT);
  return m;
}

function save(rel, map) {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(map.toTiled(), null, 1) + '\n');
  console.log('wrote', rel);
}

save('public/assets/maps/feria.json', buildFeria());
save('public/assets/maps/caseta.json', buildCasetaInterior());
save('public/assets/maps/about.json', buildAboutInterior());
save('public/assets/maps/action-detection.json', buildActionDetectionInterior());
save('public/assets/maps/volunteer-pwa.json', buildVolunteerInterior());
save('public/assets/maps/secure-voting.json', buildSecureVotingInterior());
