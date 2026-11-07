import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const barWidth = GAME_WIDTH / 2;
    const bar = this.add.rectangle((GAME_WIDTH - barWidth) / 2, GAME_HEIGHT / 2, 0, 8, 0xe0a030).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      bar.width = barWidth * value;
    });
  }

  create(): void {
    console.log('boot done');
    if (this.scene.manager.keys['World']) {
      this.scene.start('World');
    }
  }
}
