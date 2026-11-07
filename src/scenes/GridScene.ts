import Phaser from 'phaser';
import { GAME_WIDTH, TILE_SIZE } from '../config';
import { findMissingIds, getProject, type Project } from '../content/projects';
import { MISSING_PROJECT_TEXT } from '../content/projectText';
import { DialogueBox } from '../systems/DialogueBox';
import { canMove, resolveDirection, step, type Direction, type Tile } from '../systems/gridMovement';
import { facingTile, findInteractable } from '../systems/interaction';
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
const INTERACT_KEYS = new Set(['KeyZ', 'Enter', 'NumpadEnter']);
export const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };
export const FRAME_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 };
const STEP_MS = 160;
/** Object types whose `id` must name a project in projects.ts. */
const PROJECT_TYPES: ReadonlySet<MapObject['type']> = new Set(['building', 'door', 'jukebox', 'bookshelf', 'desk']);

type RawMap = { layers: { name: string; objects?: Parameters<typeof parseObjects>[0]['objects'] }[] };

/** Shared base for scenes built from a Tiled map: grid walking, keyboard input, interaction and the dialogue box. */
export abstract class GridScene extends Phaser.Scene {
  protected facing: Direction = 'down';
  protected pos: Tile = { x: 0, y: 0 };
  protected objects: MapObject[] = [];
  protected dialogue!: DialogueBox;
  protected player!: Phaser.GameObjects.Sprite;
  private pressed: Direction[] = [];
  /** A key pressed and released between two frames still counts as one step. */
  private tapped: Direction | null = null;
  private moving = false;
  /** False until spawnPlayer has run in this scene start (instances are reused across restarts). */
  private ready = false;
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private bounds = { width: 0, height: 0 };

  /** Called for the object in front of the player when Z/Enter is pressed. */
  protected abstract interact(obj: MapObject): void;

  /** Called after every completed step. */
  protected onArrive(_tile: Tile): void {}

  protected resetInput(facing: Direction): void {
    this.pressed = [];
    this.tapped = null;
    this.moving = false;
    this.ready = false;
    this.facing = facing;
  }

  /** Builds the map layers and parses its objects; returns the tilemap. */
  protected buildMap(key: string): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key });
    const tileset = map.addTilesetImage('feria', 'tiles');
    if (!tileset) throw new Error(`tileset missing in ${key}`);
    map.createLayer('ground', tileset, 0, 0);
    map.createLayer('decor', tileset, 0, 0);
    const collision = map.createLayer('collision', tileset, 0, 0);
    if (!collision) throw new Error(`collision layer missing in ${key}`);
    this.collision = collision.setVisible(false);
    this.bounds = { width: map.width, height: map.height };

    const raw = this.cache.tilemap.get(key).data as RawMap;
    const layer = raw.layers.find((l) => l.name === 'objects');
    this.objects = parseObjects({ objects: layer?.objects ?? [] }, TILE_SIZE);
    this.warnMissingIds();
    return map;
  }

  protected spawnPlayer(tile: Tile): void {
    this.pos = { ...tile };
    ensurePlayerAnims(this);
    this.player = this.add.sprite(tile.x * TILE_SIZE, tile.y * TILE_SIZE, 'player', FRAME_ROW[this.facing] * 3).setOrigin(0, 0).setDepth(10);
    this.dialogue = new DialogueBox(this);
    this.setupKeyboard();
    this.ready = true;
  }

  /** Looks up a map object's project; an unknown id warns and shows a placeholder instead of crashing. */
  protected projectFor(obj: MapObject): Project | undefined {
    const project = getProject(obj.id);
    if (!project) {
      console.warn(`Map ${obj.type} has id ${JSON.stringify(obj.id)}, which is missing from projects.ts`);
      this.dialogue.show(MISSING_PROJECT_TEXT);
    }
    return project;
  }

  update(): void {
    if (!this.ready || this.moving) return;
    if (this.dialogue.isOpen()) {
      // Movement input is ignored while the dialogue box is open.
      this.tapped = null;
      this.standStill();
      return;
    }
    const dir = resolveDirection(this.pressed, this.facing) ?? this.tapped;
    this.tapped = null;
    if (!dir) {
      this.standStill();
      return;
    }
    this.facing = dir;
    if (!canMove(this.pos, dir, (t) => this.collision.hasTileAt(t.x, t.y), this.bounds)) {
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
        this.onArrive(target);
      },
    });
  }

  private standStill(): void {
    this.player.anims.stop();
    this.player.setFrame(FRAME_ROW[this.facing] * 3);
  }

  private onInteractKey(): void {
    if (this.dialogue.isOpen()) {
      this.dialogue.advance();
      return;
    }
    if (this.moving) return;
    const target = findInteractable(this.objects, facingTile(this.pos, this.facing));
    if (target) this.interact(target);
  }

  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
    kb.on('keydown', (e: KeyboardEvent) => {
      if (INTERACT_KEYS.has(e.code)) {
        if (!e.repeat) this.onInteractKey();
        return;
      }
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
    const ids = this.objects.filter((o) => PROJECT_TYPES.has(o.type)).map((o) => o.id);
    const missing = findMissingIds(ids);
    if (missing.length === 0) return;
    const list = missing.map((id) => JSON.stringify(id)).join(', ');
    console.warn(`Map objects with ids missing from projects.ts: ${list}`);
    this.add
      .text(4, 4, `Missing project ids: ${list}`, { fontFamily: 'monospace', fontSize: '10px', color: '#ffdddd', backgroundColor: '#8f1f1c', wordWrap: { width: GAME_WIDTH - 8 } })
      .setResolution(4)
      .setScrollFactor(0)
      .setDepth(100);
  }
}

/** Walking animations are global, so they are created once per game. */
function ensurePlayerAnims(scene: Phaser.Scene): void {
  for (const dir of Object.keys(FRAME_ROW) as Direction[]) {
    const key = `player-walk-${dir}`;
    if (scene.anims.exists(key)) continue;
    const base = FRAME_ROW[dir] * 3;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers('player', { frames: [base + 1, base, base + 2, base] }), frameRate: 10, repeat: -1 });
  }
}
