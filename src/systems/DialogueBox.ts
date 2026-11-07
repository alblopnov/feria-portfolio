import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { paginate } from './dialoguePager';

const CHARS_PER_LINE = 28;
const LINES_PER_PAGE = 3;
const CHAR_MS = 22;
const MARGIN = 4;
const HEIGHT = 62;

/** Pokémon-style text box pinned to the bottom of the camera, with a typewriter effect and paging. */
export class DialogueBox {
  private readonly container: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Text;
  private pages: string[] = [];
  private page = 0;
  private shown = 0;
  private timer: Phaser.Time.TimerEvent | null = null;
  private open = false;

  /** `onType` runs for every other typed letter (the typewriter blip). */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onType: () => void = () => {},
  ) {
    const width = GAME_WIDTH - MARGIN * 2;
    const top = GAME_HEIGHT - HEIGHT - MARGIN;
    const frame = scene.add.graphics();
    frame.fillStyle(0x2e1d12, 1).fillRoundedRect(0, 0, width, HEIGHT, 4);
    frame.fillStyle(0xf6f1e4, 1).fillRoundedRect(2, 2, width - 4, HEIGHT - 4, 3);
    frame.lineStyle(1, 0xc8302c, 1).strokeRoundedRect(4.5, 4.5, width - 9, HEIGHT - 9, 2);
    this.label = scene.add
      .text(12, 8, '', { fontFamily: 'monospace', fontSize: '13px', color: '#2e1d12', lineSpacing: 2 })
      .setResolution(4);
    this.arrow = scene.add
      .text(width - 14, HEIGHT - 16, '▼', { fontFamily: 'monospace', fontSize: '10px', color: '#c8302c' })
      .setResolution(4)
      .setVisible(false);
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.container = scene.add.container(MARGIN, top, [frame, this.label, this.arrow]).setScrollFactor(0).setDepth(1000).setVisible(false);
  }

  show(text: string): void {
    this.pages = paginate(text ?? '', CHARS_PER_LINE, LINES_PER_PAGE);
    this.page = 0;
    this.open = true;
    this.container.setVisible(true);
    this.startPage();
  }

  /** Finishes the current page, then moves to the next page, then closes. */
  advance(): void {
    if (!this.open) return;
    if (this.isTyping()) {
      this.finishPage();
    } else if (this.page < this.pages.length - 1) {
      this.page++;
      this.startPage();
    } else {
      this.close();
    }
  }

  isOpen(): boolean {
    return this.open;
  }

  private current(): string {
    return this.pages[this.page] ?? '';
  }

  private isTyping(): boolean {
    return this.shown < this.current().length;
  }

  private startPage(): void {
    this.timer?.remove();
    this.shown = 0;
    this.label.setText('');
    this.arrow.setVisible(false);
    if (this.current().length === 0) {
      this.finishPage();
      return;
    }
    this.timer = this.scene.time.addEvent({
      delay: CHAR_MS,
      loop: true,
      callback: () => {
        this.shown++;
        this.label.setText(this.current().slice(0, this.shown));
        if (this.shown % 2 === 1 && /\S/.test(this.current()[this.shown - 1] ?? '')) this.onType();
        if (!this.isTyping()) this.finishPage();
      },
    });
  }

  private finishPage(): void {
    this.timer?.remove();
    this.timer = null;
    this.shown = this.current().length;
    this.label.setText(this.current());
    this.arrow.setVisible(this.page < this.pages.length - 1);
  }

  private close(): void {
    this.timer?.remove();
    this.timer = null;
    this.open = false;
    this.container.setVisible(false);
  }
}
