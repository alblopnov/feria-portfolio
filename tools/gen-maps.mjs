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
// A compact town: two rows of casetas around one short avenue that runs from the portada up to the top
// street. To enlarge the world, widen/heighten the map and push the rows, avenue and gaps apart here;
// everything else in buildFeria() is placed relative to these.
const FERIA_WIDTH = 34;
const FERIA_HEIGHT = 22;
/** Door row of the top street (row A) and of the second row (row B); facades rise above their door. */
const ROW_A_DOOR_Y = 6;
const ROW_B_DOOR_Y = 14;
/** Left of the two walkable avenue columns; the portada is centred on them. */
const AVENUE_X = 16;
/** x of the first caseta on the top street, and the tiles of albero between neighbouring casetas. */
const ROW_A_X = 2;
const CASETA_GAP = 1;
/** Top row of the portada: its bottom row sits against the fence; the player spawns inside its opening. */
const GATE_Y = FERIA_HEIGHT - 1 - PIECES.portada.h;
const SPAWN = { x: AVENUE_X, y: GATE_Y + 2 };

/** The door of a piece is its middle column (column 2 of a five-wide caseta, 3 of Caseta-musica). */
const doorColumn = (piece) => Math.floor(piece.w / 2);

const WORKS_TEXT = 'UNDER CONSTRUCTION. Hard hats only past the tape! This caseta opens its doors when the project ships.';

function buildFeria() {
  const W = FERIA_WIDTH;
  const H = FERIA_HEIGHT;
  const m = new MapBuilder(W, H);
  const r = rng(2026);
  m.fill('ground', 0, 0, W, H, () => {
    const v = r();
    return v < 0.75 ? T.ALBERO : v < 0.9 ? T.ALBERO3 : T.ALBERO2;
  });

  // Perimeter fence.
  m.fill('decor', 1, 0, W - 2, 1, T.FENCE_H);
  m.fill('decor', 1, H - 1, W - 2, 1, T.FENCE_H);
  m.fill('decor', 0, 1, 1, H - 2, T.FENCE_V);
  m.fill('decor', W - 1, 1, 1, H - 2, T.FENCE_V);
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) m.set('decor', x, y, T.FENCE_POST);
  m.block(0, 0, W, 1);
  m.block(0, H - 1, W, 1);
  m.block(0, 0, 1, H);
  m.block(W - 1, 0, 1, H);

  // Farolillo strings and bunting along the top.
  m.fill('decor', 1, 1, W - 2, 1, T.LANTERNS);
  m.fill('decor', 1, 2, W - 2, 1, T.BUNTING);

  /** Draws a caseta whose door (bottom row, middle column) is at (doorX, doorY) and puts the building there. */
  const caseta = (piece, id, x, doorY) => {
    const doorX = x + doorColumn(piece);
    m.piece(piece, x, doorY - piece.h + 1);
    m.object('building', doorX, doorY, { id });
    return doorX;
  };

  // Row A: five casetas facing south onto the top street, left to right, CASETA_GAP apart.
  // Locked projects are casetas still being built: scaffolding, caution tape, a sign and a cone.
  const works = (id, x, doorX) => {
    m.prop(x + 4, ROW_A_DOOR_Y + 1, ct(CT.OBRAS_SIGN));
    m.object('sign', x + 4, ROW_A_DOOR_Y + 1, { id: `${id}-works`, text: WORKS_TEXT });
    m.prop(x, ROW_A_DOOR_Y + 1, ct(CT.CONE));
  };
  const rowA = [
    { id: 'ml-classifier', piece: CPIECES.casetaObras, dress: works },
    { id: 'java-service', piece: CPIECES.casetaObras, dress: works },
    // Secure Voting: a little town hall with its padlocked ballot box out front.
    { id: 'secure-voting', piece: PPIECES.secureVoting, dress: (id, x) => m.prop(x + 4, ROW_A_DOOR_Y + 1, pt(PT.BALLOT_OUT)) },
    // Caseta-musica: the one caseta in full feria dress (7 wide); the albero in front of its entrance is
    // lit by the light spilling out.
    { id: 'caseta', piece: CPIECES.casetaMusica, dress: (id, x, doorX) => m.set('ground', doorX, ROW_A_DOOR_Y + 1, ct(CT.GLOW)) },
    { id: 'dashboard', piece: CPIECES.casetaObras, dress: works },
  ];
  let x = ROW_A_X;
  for (const { id, piece, dress } of rowA) {
    const doorX = caseta(piece, id, x, ROW_A_DOOR_Y);
    dress(id, x, doorX);
    x += piece.w + CASETA_GAP;
  }

  // Row B: the About house and a terraza on the left of the avenue; Action Detection (a football caseta
  // with a camera on a tripod) and Volunteer PWA (a community caseta with a noticeboard) on the right,
  // with lit albero in front of their doors.
  const houseX = AVENUE_X - 8;
  caseta(PIECES.house, 'about', houseX, ROW_B_DOOR_Y);
  m.prop(houseX + 5, ROW_B_DOOR_Y, T.POT);
  for (const tx of [houseX - 5, houseX - 2]) {
    for (const ty of [ROW_B_DOOR_Y - 2, ROW_B_DOOR_Y]) {
      m.prop(tx, ty, T.TABLE);
      m.prop(tx - 1, ty, T.CHAIR);
    }
  }
  const actionX = AVENUE_X + 5;
  const actionDoor = caseta(PPIECES.actionDetection, 'action-detection', actionX, ROW_B_DOOR_Y);
  m.set('ground', actionDoor, ROW_B_DOOR_Y + 1, ct(CT.GLOW));
  m.prop(actionX - 1, ROW_B_DOOR_Y, pt(PT.CAMERA));
  const volunteerX = actionX + PPIECES.actionDetection.w + CASETA_GAP;
  const volunteerDoor = caseta(PPIECES.volunteerPwa, 'volunteer-pwa', volunteerX, ROW_B_DOOR_Y);
  m.set('ground', volunteerDoor, ROW_B_DOOR_Y + 1, ct(CT.GLOW));
  m.prop(volunteerX + 5, ROW_B_DOOR_Y, pt(PT.NOTICE_OUT));

  // Lampposts flanking the avenue, with farolillo garlands strung between them (drawn above the player).
  for (const y of [ROW_A_DOOR_Y + 3, ROW_B_DOOR_Y - 1]) {
    m.prop(AVENUE_X - 1, y, T.LAMPPOST);
    m.prop(AVENUE_X + 2, y, T.LAMPPOST);
    m.fill('overhead', AVENUE_X, y, 2, 1, ct(CT.GARLAND));
  }

  // Bunting over the street between the rows and over the street in front of the gate (clear of the post box).
  m.fill('overhead', 1, ROW_A_DOOR_Y + 2, W - 2, 1, ct(CT.PENNANTS));
  m.fill('overhead', 1, GATE_Y - 1, AVENUE_X - 3, 1, ct(CT.PENNANTS));
  m.fill('overhead', AVENUE_X + 5, GATE_Y - 1, W - AVENUE_X - 6, 1, ct(CT.PENNANTS));

  // Contact post box on the right edge of the avenue, just inside the gate: step up from the spawn and tap right.
  m.prop(AVENUE_X + 2, GATE_Y - 2, T.POSTBOX);
  m.object('building', AVENUE_X + 2, GATE_Y - 2, { id: 'contact' });

  // A welcome sign on the left edge of the avenue, just inside the gate, and the Credits sign beside the gate:
  // every asset in the game is original and generated by the scripts in tools/.
  m.prop(AVENUE_X - 1, GATE_Y - 1, T.SIGN);
  m.object('sign', AVENUE_X - 1, GATE_Y - 1, {
    id: 'welcome-sign',
    text: 'Welcome to the Feria! Each caseta is one of my projects. Walk into a door to go inside, and press Z or Enter to talk to people and read signs.',
  });
  const creditsX = AVENUE_X - 6;
  m.piece(CPIECES.creditsSign, creditsX, GATE_Y);
  for (const cx of [creditsX, creditsX + 1]) {
    m.object('sign', cx, GATE_Y, {
      id: 'credits',
      text: 'CREDITS. Every tile, sprite, sign and sound in this feria is original, made by the Node scripts in tools/ (gen-assets, gen-maps, gen-audio). There are no third-party assets. Built with Phaser 3, TypeScript and Vite. Full list in CREDITS.md.',
    });
  }

  // The flamenca greets you just inside the gate, beside the avenue, under the post box.
  m.block(AVENUE_X + 2, GATE_Y - 1);
  m.object('npc', AVENUE_X + 2, GATE_Y - 1, {
    id: 'flamenca',
    text: "Hola! The red caseta up north is Caseta-musica, a party jukebox. The town hall, the football caseta and the volunteers' caseta are finished projects too, so step inside. The green ones are still being built.",
  });

  // Two more feriantes with tips and hints about what's coming.
  m.block(6, ROW_A_DOOR_Y + 3);
  m.object('npc', 6, ROW_A_DOOR_Y + 3, {
    id: 'feriante',
    text: "Those green casetas behind the tape? One will be an ML classifier, one a Java service, and the far one a dashboard for everything running in Docker. They open when they're ready.",
  });
  // The senor strolls by the noria, out of the alley between the two CV casetas.
  const noriaX = W - 2 - CPIECES.noria.w;
  m.block(noriaX - 3, GATE_Y);
  m.object('npc', noriaX - 3, GATE_Y, {
    id: 'senor',
    text: 'Explore everything: walk into a door to go in, and press Z (or tap A) at signs and people. The blue-tiled house is the author\'s, the jukebox in the red caseta tells its story, and the post box by the gate has the contact links.',
  });

  // A small noria (ferris wheel) in the bottom-right corner: decorative, fenced off by collision. Its
  // sign is the top of the wheel, read from the street above.
  m.piece(CPIECES.noria, noriaX, GATE_Y);
  m.object('sign', noriaX + 2, GATE_Y, {
    id: 'noria',
    text: 'La noria. It is closed tonight, but it looks lovely from down here.',
  });

  // Flower pots along the bottom fence, leaving the gate, the post box and the noria clear.
  for (let px = 2; px < W - 2; px += 3) {
    if ((px >= AVENUE_X - 3 && px <= AVENUE_X + 4) || px >= noriaX) continue;
    m.prop(px, H - 2, T.POT);
  }

  // The portada gate; its two middle columns are the walkable opening onto the avenue.
  m.piece(PIECES.portada, AVENUE_X - 2, GATE_Y);
  for (let y = GATE_Y; y < GATE_Y + PIECES.portada.h; y++) {
    m.unblock(AVENUE_X, y);
    m.unblock(AVENUE_X + 1, y);
  }
  m.object('spawn', SPAWN.x, SPAWN.y, { id: 'portada' }, 'portada');

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
