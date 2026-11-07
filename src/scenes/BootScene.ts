import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config';

export const LOAD_ERROR_TEXT = "Couldn't load the feria, refresh";

export class BootScene extends Phaser.Scene {
  private failed: string[] = [];

  constructor() {
    super('Boot');
  }

  preload(): void {
    const barWidth = GAME_WIDTH / 2;
    const bar = this.add.rectangle((GAME_WIDTH - barWidth) / 2, GAME_HEIGHT / 2, 0, 8, 0xe0a030).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      bar.width = barWidth * value;
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.failed.push(file.key);
    });

    this.load.image('tiles', 'assets/tilesets/feria.png');
    this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    this.load.spritesheet('npc', 'assets/sprites/npc.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    this.load.tilemapTiledJSON('feria', 'assets/maps/feria.json');
  }

  create(): void {
    // A missing file can also come back as an HTML fallback page that fails to parse without a
    // loaderror event, so check the caches as well.
    const missing = [
      ...this.failed,
      ...(['tiles', 'player', 'npc'] as const).filter((k) => !this.textures.exists(k)),
      ...(['feria'] as const).filter((k) => !this.cache.tilemap.exists(k)),
    ];
    if (missing.length > 0) {
      console.error('Failed to load assets:', [...new Set(missing)]);
      this.showLoadError();
      return;
    }
    console.log('boot done');
    if (this.scene.manager.keys['World']) {
      this.scene.start('World');
    }
  }

  private showLoadError(): void {
    this.children.removeAll();
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, LOAD_ERROR_TEXT, { fontFamily: 'monospace', fontSize: '14px', color: '#f6f1e4', align: 'center', wordWrap: { width: GAME_WIDTH - 32 } })
      .setOrigin(0.5)
      .setResolution(4);
  }
}
