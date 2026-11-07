import Phaser from 'phaser';
import { GAME_WIDTH, TILE_SIZE } from '../config';
import { findMissingIds, getProject, type Project } from '../content/projects';
import { MISSING_PROJECT_TEXT } from '../content/projectText';
import { DialogueBox } from '../systems/DialogueBox';
import { canMove, resolveDirection, step, type Direction, type Tile } from '../systems/gridMovement';
import { hasMarker, nameTagFor, promptFor } from '../systems/hints';
import { facingTile, findInteractable } from '../systems/interaction';
import { parseObjects, type MapObject } from '../systems/mapObjects';
import { audioGate, isMuted, playSfx, toggleMute } from '../systems/sound';
import { isTouchDevice } from '../systems/touchControls';
import { TouchPad } from '../systems/TouchPad';
import { LinkOverlay, safeLinks } from '../systems/LinkOverlay';

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
/** Texture key for each tileset name used in the Tiled maps (loaded by BootScene). */
const TILESET_TEXTURES: Record<string, string> = { feria: 'tiles', 'feria-custom': 'tiles-custom', 'feria-projects': 'tiles-projects' };
/** HUD icon frames in the tiles-custom spritesheet (CT.SOUND_ON / CT.SOUND_OFF in tools/tileset-layout.mjs). */
const SOUND_FRAMES = { on: 31, off: 47 };
export const DEPTH = { npc: 9, player: 10, overhead: 20, vignette: 50, warning: 100, hud: 1100 };
/** Object types whose `id` must name a project in projects.ts. */
const PROJECT_TYPES: ReadonlySet<MapObject['type']> = new Set(['building', 'door', 'jukebox', 'bookshelf', 'desk', 'exhibit']);

type RawMap = { layers: { name: string; objects?: Parameters<typeof parseObjects>[0]['objects'] }[] };

/** Shared base for scenes built from a Tiled map: grid walking, keyboard input, interaction and the dialogue box. */
export abstract class GridScene extends Phaser.Scene {
  protected facing: Direction = 'down';
  protected pos: Tile = { x: 0, y: 0 };
  protected objects: MapObject[] = [];
  protected dialogue!: DialogueBox;
  /** HTML panel with a project's links, opened after its card closes. */
  protected links!: LinkOverlay;
  protected player!: Phaser.GameObjects.Sprite;
  private pressed: Direction[] = [];
  /** A key pressed and released between two frames still counts as one step. */
  private tapped: Direction | null = null;
  private moving = false;
  /** False until spawnPlayer has run in this scene start (instances are reused across restarts). */
  private ready = false;
  private collision!: Phaser.Tilemaps.TilemapLayer;
  private bounds = { width: 0, height: 0 };
  /** On-screen stick and A button; only created on touch devices. */
  private touch: TouchPad | null = null;
  /** Bobbing arrows over usable things, and the bubble that names the action in front of the player. */
  private arrows = new Map<MapObject, Phaser.GameObjects.Triangle>();
  private prompt: Phaser.GameObjects.Text | null = null;
  private touchMode = false;

  /** Called for the object in front of the player when Z/Enter is pressed. */
  protected abstract interact(obj: MapObject): void;

  /** Called after every completed step. */
  protected onArrive(_tile: Tile): void {}

  protected resetInput(facing: Direction): void {
    this.pressed = [];
    this.tapped = null;
    this.moving = false;
    this.ready = false;
    this.touch = null;
    this.arrows.clear();
    this.prompt = null;
    this.facing = facing;
  }

  /** Builds the map layers and parses its objects; returns the tilemap. */
  protected buildMap(key: string): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key });
    const tilesets = map.tilesets.map((ts) => {
      const texture = TILESET_TEXTURES[ts.name];
      const added = texture ? map.addTilesetImage(ts.name, texture) : null;
      if (!added) throw new Error(`tileset ${ts.name} missing in ${key}`);
      return added;
    });
    map.createLayer('ground', tilesets, 0, 0);
    map.createLayer('decor', tilesets, 0, 0);
    // Bunting and garlands hang over the street, so they draw above the player.
    if (map.getLayerIndex('overhead') !== null) map.createLayer('overhead', tilesets, 0, 0)?.setDepth(DEPTH.overhead);
    const collision = map.createLayer('collision', tilesets, 0, 0);
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
    this.player = this.add.sprite(tile.x * TILE_SIZE, tile.y * TILE_SIZE, 'player', FRAME_ROW[this.facing] * 3).setOrigin(0, 0).setDepth(DEPTH.player);
    this.dialogue = new DialogueBox(this, () => playSfx(this.game, 'blip', { volume: 0.18 }));
    this.links = new LinkOverlay(this.game.canvas);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.links.close());
    this.add.image(0, 0, 'vignette').setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.vignette);
    this.setupKeyboard();
    this.setupAudio();
    this.touchMode = isTouchDevice();
    this.touch = this.touchMode ? new TouchPad(this, () => this.onInteractKey()) : null;
    this.addMarkers();
    this.ready = true;
  }

  /** Name tags over the buildings, a bobbing arrow over everything usable, and the action bubble (hidden until needed). */
  private addMarkers(): void {
    const markerDepth = DEPTH.overhead + 1;
    for (const obj of this.objects) {
      if (!hasMarker(obj)) continue;
      const cx = obj.tile.x * TILE_SIZE + TILE_SIZE / 2;
      const top = obj.tile.y * TILE_SIZE;
      const arrow = this.add.triangle(cx, top - 5, 0, 0, 8, 0, 4, 6, 0xffd24a).setStrokeStyle(1, 0x2e1d12).setDepth(markerDepth);
      this.tweens.add({ targets: arrow, y: arrow.y - 3, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.arrows.set(obj, arrow);
      const project = getProject(obj.id);
      const tag = nameTagFor(obj, project);
      if (!tag) continue;
      this.add
        .text(cx, top - 12, tag, { fontFamily: 'monospace', fontSize: '8px', align: 'center', color: project?.locked ? '#d8c9a8' : '#f6f1e4', backgroundColor: project?.locked ? '#5a4a3a' : '#2e1d12', padding: { x: 2, y: 1 } })
        .setOrigin(0.5, 1)
        .setResolution(4)
        .setDepth(markerDepth);
    }
    this.prompt = this.add
      .text(0, 0, '', { fontFamily: 'monospace', fontSize: '8px', color: '#2e1d12', backgroundColor: '#ffd24a', padding: { x: 3, y: 2 } })
      .setOrigin(0.5, 1)
      .setResolution(4)
      .setDepth(markerDepth + 1)
      .setVisible(false);
  }

  /** Shows "Z · Enter ..." over the object in front of the player while they stand still and nothing else is open. */
  private updateHint(busy: boolean): void {
    const target = !busy && !this.moving ? findInteractable(this.objects, facingTile(this.pos, this.facing)) : undefined;
    const text = target ? promptFor(target, getProject(target.id), this.touchMode) : null;
    for (const [obj, arrow] of this.arrows) arrow.setVisible(!(text && obj === target));
    const prompt = this.prompt;
    if (!prompt) return;
    if (!target || !text) {
      prompt.setVisible(false);
      return;
    }
    if (prompt.text !== text) prompt.setText(text);
    const view = this.cameras.main.worldView;
    const half = prompt.displayWidth / 2 + 2;
    const x = Phaser.Math.Clamp(target.tile.x * TILE_SIZE + TILE_SIZE / 2, view.left + half, view.right - half);
    prompt.setPosition(x, target.tile.y * TILE_SIZE - 3).setVisible(true);
  }

  /** First key or pointer press unlocks audio (browser autoplay rules); the mute button is always on screen. */
  private setupAudio(): void {
    const unlock = () => audioGate(this.game).unlock();
    this.input.keyboard?.on('keydown', unlock);
    this.input.on('pointerdown', unlock);

    const button = this.add
      .image(GAME_WIDTH - 4, 4, 'tiles-custom', isMuted(this.game) ? SOUND_FRAMES.off : SOUND_FRAMES.on)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true });
    const toggle = () => button.setFrame(toggleMute(this.game) ? SOUND_FRAMES.off : SOUND_FRAMES.on);
    button.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      unlock();
      toggle();
      event.stopPropagation(); // a tap on the button is not a tap on the touch controls
    });
    this.input.keyboard?.on('keydown-M', toggle);
  }

  /** Shows `text` in the dialogue box; when it closes, the project's links open as real anchors. */
  protected showWithLinks(text: string, project: Project): void {
    this.dialogue.show(text, () => this.links.open(project.title, safeLinks(project)));
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
    if (!this.ready) return;
    const busy = this.dialogue.isOpen() || this.links.isOpen();
    this.touch?.setStickVisible(!busy);
    this.updateHint(busy);
    if (this.moving) return;
    if (busy) {
      // Movement input is ignored while the dialogue box or the links panel is open.
      this.tapped = null;
      this.standStill();
      return;
    }
    // Keyboard first, then the touch stick, then a key tapped between two frames.
    const dir = resolveDirection(this.pressed, this.facing) ?? this.touch?.direction() ?? this.tapped;
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
    playSfx(this.game, 'step', { volume: 0.22, detune: Phaser.Math.Between(-150, 150) });
    this.tweens.add({
      targets: this.player,
      x: target.x * TILE_SIZE,
      y: target.y * TILE_SIZE,
      duration: STEP_MS,
      onComplete: () => {
        this.pos = target;
        this.moving = false;
        this.onArrive(target);
        this.game.events.emit('feria:step');
      },
    });
  }

  private standStill(): void {
    this.player.anims.stop();
    this.player.setFrame(FRAME_ROW[this.facing] * 3);
  }

  private onInteractKey(): void {
    if (this.links.isOpen()) {
      this.links.close();
      return;
    }
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
      if (this.links.isOpen()) {
        // Keys pressed on the panel's own anchors and button keep their normal browser behaviour.
        if (this.links.contains(e.target)) return;
        if ((INTERACT_KEYS.has(e.code) || e.code === 'Escape') && !e.repeat) this.links.close();
        return;
      }
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
      .setDepth(DEPTH.warning);
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
