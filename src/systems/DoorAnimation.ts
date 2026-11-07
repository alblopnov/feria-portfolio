import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import type { DoorTiming } from './doorTiming';
import type { Tile } from './gridMovement';

/** Above the map layers (0), below NPCs (9) and the player (10). */
const DOOR_DEPTH = 6;
/** How far the leaf has swung when the door is open, and how much it narrows on screen. */
const OPEN_SCALE_X = 0.15;
const OPEN_SCALE_Y = 0.94;
/** The player shrinks to this size in the doorway, about the feet, so the camera never jumps. */
const DOORWAY_SCALE = 0.8;

/** Top-left of the player sprite when it stands, shrunk, in the doorway with its feet at the door tile's bottom centre. */
function doorwayPosition(door: Tile): Tile {
  return { x: door.x * TILE_SIZE + (TILE_SIZE / 2) * (1 - DOORWAY_SCALE), y: door.y * TILE_SIZE + TILE_SIZE * (1 - DOORWAY_SCALE) };
}

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

/** The dark, warm doorway that shows behind the swinging leaf. */
function doorway(scene: Phaser.Scene, door: Tile): Phaser.GameObjects.Rectangle[] {
  const px = door.x * TILE_SIZE;
  const py = door.y * TILE_SIZE;
  return [
    scene.add.rectangle(px, py, TILE_SIZE, TILE_SIZE, 0x24150a).setOrigin(0, 0).setDepth(DOOR_DEPTH - 1),
    scene.add.rectangle(px + 3, py + 2, TILE_SIZE - 6, TILE_SIZE - 3, 0xffc866, 0.3).setOrigin(0, 0).setDepth(DOOR_DEPTH - 1),
  ];
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
  const stepIn = () => {
    if (timing.step <= 0) {
      onDone();
      return;
    }
    // Shrink about the feet so the player seems to walk away from the camera into the doorway.
    const { x, y } = doorwayPosition(door);
    scene.tweens.add({ targets: player, x, y, scale: DOORWAY_SCALE, alpha: 0.55, duration: timing.step, ease: 'Sine.easeInOut', onComplete: onDone });
  };

  const leaf = timing.open > 0 ? doorLeaf(scene, map, door) : null;
  if (!leaf) {
    stepIn();
    return;
  }
  doorway(scene, door);
  scene.tweens.add({ targets: leaf, scaleX: OPEN_SCALE_X, scaleY: OPEN_SCALE_Y, duration: timing.open, ease: 'Sine.easeInOut', onComplete: stepIn });
}

/**
 * The way out, the reverse of playDoorOpen: the player starts small in the open doorway, walks out to the
 * tile in front and grows back to full size, and the door swings shut behind them. `onDone` runs as soon
 * as the player is out (the door finishes closing on its own). With zero durations nothing animates.
 */
export function playDoorExit(
  scene: Phaser.Scene,
  map: Phaser.Tilemaps.Tilemap,
  door: Tile,
  front: Tile,
  player: Phaser.GameObjects.Sprite,
  timing: DoorTiming,
  onDone: () => void,
): void {
  const settle = () => player.setScale(1).setAlpha(1).setPosition(front.x * TILE_SIZE, front.y * TILE_SIZE);
  if (timing.out <= 0) {
    settle();
    onDone();
    return;
  }
  const leaf = timing.close > 0 ? doorLeaf(scene, map, door) : null;
  const parts: Phaser.GameObjects.GameObject[] = leaf ? [...doorway(scene, door), leaf] : [];
  leaf?.setScale(OPEN_SCALE_X, OPEN_SCALE_Y);

  const start = doorwayPosition(door);
  player.setScale(DOORWAY_SCALE).setAlpha(0.55).setPosition(start.x, start.y);
  scene.tweens.add({
    targets: player,
    x: front.x * TILE_SIZE,
    y: front.y * TILE_SIZE,
    scale: 1,
    alpha: 1,
    duration: timing.out,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      settle();
      onDone();
      if (!leaf) return;
      scene.tweens.add({ targets: leaf, scaleX: 1, scaleY: 1, duration: timing.close, ease: 'Sine.easeInOut', onComplete: () => parts.forEach((p) => p.destroy()) });
    },
  });
}
