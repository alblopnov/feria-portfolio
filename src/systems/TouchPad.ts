import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { Direction } from './gridMovement';
import { directionFromDelta } from './touchControls';

/** Drag distance (game pixels) before the stick counts as a direction: taps never walk. */
const DEADZONE = 8;
const STICK_RADIUS = 20;
const KNOB_RADIUS = 8;
const STICK_HOME = { x: 40, y: GAME_HEIGHT - 44 };
/** The stick grabs touches that start in the lower-left part of the screen. */
const STICK_ZONE = new Phaser.Geom.Rectangle(0, 40, GAME_WIDTH * 0.55, GAME_HEIGHT - 40);
/** The A button sits above the dialogue box so it never hides its text. */
const A_BUTTON = { x: GAME_WIDTH - 30, y: GAME_HEIGHT - 96, r: 16 };
const DEPTH = 1100;

/**
 * On-screen controls for touch devices: a floating virtual stick (it centres wherever the thumb lands)
 * and an A button. The scene reads `direction()` alongside the keyboard, and A calls the same
 * interact path as Z/Enter.
 */
export class TouchPad {
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly button: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private stickPointer: number | null = null;
  private origin = { ...STICK_HOME };
  private dir: Direction | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onInteract: () => void,
  ) {
    const fixed = <T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth>(o: T) => o.setScrollFactor(0).setDepth(DEPTH);
    this.base = fixed(scene.add.circle(STICK_HOME.x, STICK_HOME.y, STICK_RADIUS, 0x2e1d12, 0.35).setStrokeStyle(1, 0xf6f1e4, 0.6));
    this.knob = fixed(scene.add.circle(STICK_HOME.x, STICK_HOME.y, KNOB_RADIUS, 0xf6f1e4, 0.7));
    this.button = fixed(scene.add.circle(A_BUTTON.x, A_BUTTON.y, A_BUTTON.r, 0xc8302c, 0.75).setStrokeStyle(1, 0xf6f1e4, 0.9));
    this.label = fixed(
      scene.add.text(A_BUTTON.x, A_BUTTON.y, 'A', { fontFamily: 'monospace', fontSize: '14px', color: '#f6f1e4', fontStyle: 'bold' }).setOrigin(0.5).setResolution(4),
    );

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.release, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(Phaser.Core.Events.BLUR, this.release, this));
  }

  /** The direction the stick is held in, or null. */
  direction(): Direction | null {
    return this.dir;
  }

  /** The stick fades out while a dialogue is open (walking is ignored then); A stays to advance text. */
  setStickVisible(visible: boolean): void {
    this.base.setVisible(visible);
    this.knob.setVisible(visible);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (Phaser.Math.Distance.Between(pointer.x, pointer.y, A_BUTTON.x, A_BUTTON.y) <= A_BUTTON.r + 4) {
      this.button.setFillStyle(0x8f1f1c, 0.9);
      this.scene.time.delayedCall(120, () => this.button.setFillStyle(0xc8302c, 0.75));
      this.onInteract();
      return;
    }
    if (this.stickPointer !== null || !STICK_ZONE.contains(pointer.x, pointer.y)) return;
    this.stickPointer = pointer.id;
    this.origin = { x: pointer.x, y: pointer.y };
    this.base.setPosition(pointer.x, pointer.y);
    this.knob.setPosition(pointer.x, pointer.y);
    this.dir = null;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.stickPointer) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    this.dir = directionFromDelta(dx, dy, DEADZONE);
    const len = Math.hypot(dx, dy);
    const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1;
    this.knob.setPosition(this.origin.x + dx * k, this.origin.y + dy * k);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.stickPointer) this.release();
  }

  private release(): void {
    this.stickPointer = null;
    this.dir = null;
    this.base.setPosition(STICK_HOME.x, STICK_HOME.y);
    this.knob.setPosition(STICK_HOME.x, STICK_HOME.y);
  }
}
