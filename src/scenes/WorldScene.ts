import Phaser from 'phaser';
import { GAME_WIDTH, TILE_SIZE } from '../config';
import { findMissingIds } from '../content/projects';
import { canMove, resolveDirection, step, type Direction, type Tile } from '../systems/gridMovement';
import { parseObjects, type MapObject } from '../systems/mapObjects';

const KEY_DIRS: Record<string, Direction> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};
const FRAME_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
const STEP_MS = 160;

export type WorldData = { spawnTile?: Tile; facing?: Direction };

type RawMap = { width: number; height: number; layers: { name: string; objects?: Parameters<typeof parseObjects>[0]['objects'] }[] };

export class WorldScene extends Phaser.Scene {
  private pressed: Direction[] = [];
  /** A key pressed and released between two frames still counts as one step. */
  private tapped: Direction | null = null;
  private facing: Direction = 'up';
  private moving = false;
  private pos: Tile = { x: 0, y: 0 };
  private spawnOverride: Tile | null = null;
  private player!: Phaser.GameObjects.Sprite;
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private bounds = { width: 0, height: 0 };
  private objects: MapObject[] = [];

  constructor() {
    super('World');
  }

  init(data: WorldData): void {
    this.pressed = [];
    this.tapped = null;
    this.moving = false;
    this.spawnOverride = data?.spawnTile ?? null;
    this.facing = data?.facing ?? 'up';
  }

  create(): void {
    const map = this.make.tilemap({ key: 'feria' });
    const tileset = map.addTilesetImage('feria', 'tiles');
    if (!tileset) throw new Error('feria tileset missing');
    map.createLayer('ground', tileset, 0, 0);
    map.createLayer('decor', tileset, 0, 0);
    const collision = map.createLayer('collision', tileset, 0, 0);
    if (!collision) throw new Error('collision layer missing');
    this.collision = collision.setVisible(false);
    this.bounds = { width: map.width, height: map.height };

    const raw = this.cache.tilemap.get('feria').data as RawMap;
    const layer = raw.layers.find((l) => l.name === 'objects');
    this.objects = parseObjects({ objects: layer?.objects ?? [] }, TILE_SIZE);
    this.warnMissingIds();

    const spawn = this.objects.find((o) => o.type === 'spawn' && o.id === 'portada') ?? this.objects.find((o) => o.type === 'spawn');
    this.pos = this.spawnOverride ?? spawn?.tile ?? { x: 1, y: 1 };

    ensurePlayerAnims(this);
    this.player = this.add.sprite(this.pos.x * TILE_SIZE, this.pos.y * TILE_SIZE, 'player', FRAME_ROW[this.facing] * 3).setOrigin(0, 0).setDepth(10);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true);
    cam.setRoundPixels(true);

    this.setupKeyboard();
  }

  update(): void {
    if (this.moving) return;
    const dir = resolveDirection(this.pressed, this.facing) ?? this.tapped;
    this.tapped = null;
    if (!dir) {
      this.standStill();
      return;
    }
    this.facing = dir;
    if (!canMove(this.pos, dir, (t) => this.isBlocked(t), this.bounds)) {
      this.standStill();
      return;
    }
    const target = step(this.pos, dir);
    this.moving = true;
    this.player.anims.play(`player-walk-${dir}`, true);
    this.tweens.add({
      targets: this.player,
      x: target.x * TILE_SIZE,
      y: target.y * TILE_SIZE,
      duration: STEP_MS,
      onComplete: () => {
        this.pos = target;
        this.moving = false;
      },
    });
  }

  private isBlocked(t: Tile): boolean {
    return this.collision.hasTileAt(t.x, t.y);
  }

  private standStill(): void {
    this.player.anims.stop();
    this.player.setFrame(FRAME_ROW[this.facing] * 3);
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
    kb.on('keydown', (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir && !this.pressed.includes(dir)) {
        this.pressed.push(dir);
        this.tapped = dir;
      }
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir) this.pressed = this.pressed.filter((d) => d !== dir);
    });
    const clear = () => (this.pressed = []);
    this.game.events.on(Phaser.Core.Events.BLUR, clear);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, clear));
  }

  private warnMissingIds(): void {
    const ids = this.objects.filter((o) => o.type === 'building' || o.type === 'door').map((o) => o.id);
    const missing = findMissingIds(ids);
    if (missing.length === 0) return;
    const list = missing.map((id) => JSON.stringify(id)).join(', ');
    console.warn(`Map objects with ids missing from projects.ts: ${list}`);
    this.add
      .text(4, 4, `Missing project ids: ${list}`, { fontFamily: 'monospace', fontSize: '10px', color: '#ffdddd', backgroundColor: '#8f1f1c', wordWrap: { width: GAME_WIDTH - 8 } })
      .setScrollFactor(0)
      .setDepth(100);
  }
}

/** Walking and standing animations are global, so they are created once per game. */
export function ensurePlayerAnims(scene: Phaser.Scene): void {
  for (const dir of Object.keys(FRAME_ROW) as Direction[]) {
    const key = `player-walk-${dir}`;
    if (scene.anims.exists(key)) continue;
    const base = FRAME_ROW[dir] * 3;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers('player', { frames: [base + 1, base, base + 2, base] }), frameRate: 10, repeat: -1 });
  }
}
