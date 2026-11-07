import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { DoorTiming } from './doorTiming';
import type { Tile } from './gridMovement';

/** Above the map layers (0), below NPCs (9) and the player (10). */
const DOOR_DEPTH = 6;

/** A copy of the door tile's own art, so every caseta opens its own door; null if the tile has none. */
function doorLeaf(scene: Phaser.Scene, map: Phaser.Tilemaps.Tilemap, door: Tile): Phaser.GameObjects.Image | null {
  const tile = map.getTileAt(door.x, door.y, true, 'decor');
  const tileset = tile?.tileset;
  const key = tileset?.image?.key;
  const coords = (tile && tile.index >= 0 ? tileset?.getTileTextureCoordinates(tile.index) : null) as { x: number; y: number } | null | undefined;
  if (!tile || !key || !coords) return null;
  const frame = `door-${tile.index}`;
  const texture = scene.textures.get(key);
  if (!texture.has(frame)) texture.add(frame, 0, coords.x, coords.y, TILE_SIZE, TILE_SIZE);
  return scene.add.image(door.x * TILE_SIZE, door.y * TILE_SIZE + TILE_SIZE / 2, key, frame).setOrigin(0, 0.5).setDepth(DOOR_DEPTH);
}

/**
 * Swings the door tile's art open on its left hinge over a dark, warm doorway, then walks the player
 * into the doorway. `onDone` runs once the player is in; with zero durations the steps are skipped.
 */
export function playDoorOpen(
  scene: Phaser.Scene,
  map: Phaser.Tilemaps.Tilemap,
  door: Tile,
  player: Phaser.GameObjects.Sprite,
  timing: DoorTiming,
  onDone: () => void,
): void {
  const px = door.x * TILE_SIZE;
  const py = door.y * TILE_SIZE;

  const stepIn = () => {
    if (timing.step <= 0) {
      onDone();
      return;
    }
    // Shrink about the feet so the player seems to walk away from the camera into the doorway.
    player.setOrigin(0.5, 1).setPosition(player.x + TILE_SIZE / 2, player.y + TILE_SIZE);
    scene.tweens.add({ targets: player, x: px + TILE_SIZE / 2, y: py + TILE_SIZE, scale: 0.8, alpha: 0.55, duration: timing.step, ease: 'Sine.easeIn', onComplete: onDone });
  };

  const leaf = timing.open > 0 ? doorLeaf(scene, map, door) : null;
  if (!leaf) {
    stepIn();
    return;
  }
  scene.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0x24150a).setOrigin(0, 0).setDepth(DOOR_DEPTH - 1);
  scene.add.rectangle(px + 3, py + 2, TILE_SIZE - 6, TILE_SIZE - 3, 0xffc866, 0.3).setOrigin(0, 0).setDepth(DOOR_DEPTH - 1);
  scene.tweens.add({ targets: leaf, scaleX: 0.15, scaleY: 0.94, duration: timing.open, ease: 'Sine.easeInOut', onComplete: stepIn });
}
