import { describe, expect, it } from 'vitest';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../src/config';

describe('game config', () => {
  it('uses 16px tiles', () => {
    expect(TILE_SIZE).toBe(16);
  });

  it('fits a whole number of tiles in the view', () => {
    expect(GAME_WIDTH % TILE_SIZE).toBe(0);
    expect(GAME_HEIGHT % TILE_SIZE).toBe(0);
  });
});
