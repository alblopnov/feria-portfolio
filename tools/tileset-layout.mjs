// Shared tile index table for tools/gen-assets.mjs (draws the tileset) and tools/gen-maps.mjs (places tiles).
// Indices are 0-based local tile ids; Tiled gids are index + 1 (the tileset's firstgid is 1).

export const TILE = 16;
export const COLUMNS = 16;
export const ROWS = 10;

export const T = {
  ALBERO: 0,
  ALBERO2: 1,
  ALBERO3: 2,
  COBBLE: 3,
  FENCE_H: 4,
  FENCE_V: 5,
  BLOCK: 6,
  WOOD: 7,
  WOOD2: 8,
  WALL: 9,
  AZULEJO: 10,
  LAMPPOST: 11,
  POT: 12,
  SIGN: 13,
  POSTBOX: 14,
  MAT: 15,
  LANTERNS: 16,
  BUNTING: 17,
  STAGE: 18,
  RUG: 19,
  SHELF_T: 20,
  SHELF_B: 21,
  DESK_L: 22,
  DESK_R: 23,
  JUKE_T: 24,
  JUKE_B: 25,
  CHAIR: 26,
  TABLE: 27,
  GUITAR: 28,
  SPEAKER: 29,
  VOID: 30,
  FENCE_POST: 31,
};

// Multi-tile pieces: top-left tile column/row in the tileset and size in tiles.
export const PIECES = {
  casetaRed: { col: 0, row: 2, w: 5, h: 4 },
  casetaGreen: { col: 5, row: 2, w: 5, h: 4 },
  house: { col: 10, row: 2, w: 5, h: 4 },
  portada: { col: 0, row: 6, w: 6, h: 4 },
};

/** Local tile index of tile (cx, cy) inside a piece. */
export function pieceTile(piece, cx, cy) {
  return piece.offset + (piece.row + cy) * COLUMNS + piece.col + cx;
}
for (const p of Object.values(PIECES)) p.offset = 0;

// ---------- Second tileset: feria-custom.png (feria-specific pieces) ----------
// In the maps it follows the base tileset (firstgid = base tilecount + 1), so map builders address its
// tiles as CUSTOM_OFFSET + local index.
export const CUSTOM_COLUMNS = 16;
export const CUSTOM_ROWS = 8;
export const CUSTOM_OFFSET = COLUMNS * ROWS;

/** Local indices inside feria-custom.png (add CUSTOM_OFFSET when placing them in a map). */
export const CT = {
  OBRAS_SIGN: 14,
  CONE: 15,
  GLOW: 28, // albero lit by the caseta entrance
  GARLAND: 29, // overhead string of farolillos
  PENNANTS: 30, // overhead bunting
  SOUND_ON: 31, // HUD icons (also loaded as spritesheet frames)
  SOUND_OFF: 47,
};

export const CPIECES = {
  casetaMusica: { col: 0, row: 0, w: 7, h: 5, offset: CUSTOM_OFFSET },
  casetaObras: { col: 7, row: 0, w: 5, h: 4, offset: CUSTOM_OFFSET },
  creditsSign: { col: 12, row: 0, w: 2, h: 1, offset: CUSTOM_OFFSET },
  noria: { col: 7, row: 4, w: 5, h: 4, offset: CUSTOM_OFFSET }, // distant ferris wheel
};

// ---------- Third tileset: feria-projects.png (the CV project casetas and their rooms) ----------
// It follows feria-custom in the maps (firstgid = base + custom tilecount + 1).
export const PROJECT_COLUMNS = 16;
export const PROJECT_ROWS = 8;
export const PROJECT_OFFSET = CUSTOM_OFFSET + CUSTOM_COLUMNS * CUSTOM_ROWS;

/** Local indices inside feria-projects.png (add PROJECT_OFFSET when placing them in a map). */
export const PT = {
  CAMERA: 15, // camera on a tripod, outside the football caseta
  NOTICE_OUT: 31, // small noticeboard outside the volunteers caseta
  BALLOT_OUT: 47, // padlocked ballot box outside the town hall
  MIC: 63, // commentary desk with a microphone
  COMM_DESK: 79, // commentary desk with headphones and notes
  SIGNUP_L: 90, // sign-up table: clipboard
  SIGNUP_R: 91, // sign-up table: pens and flyers
  TURF: 92, // pitch-striped carpet
  CARPET: 93, // navy carpet with gold dots
  BOOTH: 94, // voting booth with a curtain
  BOXES: 95, // donation boxes
};

export const PPIECES = {
  secureVoting: { col: 0, row: 0, w: 5, h: 5, offset: PROJECT_OFFSET }, // town hall, door in local column 2
  actionDetection: { col: 5, row: 0, w: 5, h: 5, offset: PROJECT_OFFSET }, // football caseta, door in local column 2
  volunteerPwa: { col: 10, row: 0, w: 5, h: 5, offset: PROJECT_OFFSET }, // volunteers caseta, door in local column 2
  screen: { col: 0, row: 5, w: 3, h: 2, offset: PROJECT_OFFSET }, // big screen: pitch with detection boxes
  noticeBoard: { col: 3, row: 5, w: 3, h: 2, offset: PROJECT_OFFSET }, // task cards
  resultsBoard: { col: 6, row: 5, w: 3, h: 2, offset: PROJECT_OFFSET }, // live results
  ballotBox: { col: 9, row: 5, w: 1, h: 2, offset: PROJECT_OFFSET }, // ballot box with a padlock
};
