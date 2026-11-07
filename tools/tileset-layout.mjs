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
  return (piece.row + cy) * COLUMNS + piece.col + cx;
}
