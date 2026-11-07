import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config';
import { interiors } from '../content/interiors';
import { AUDIO } from '../systems/sound';

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
      // Audio is optional: the game runs silently without it.
      if (file.type === 'audio') console.warn(`Audio ${file.key} failed to load; continuing without it`);
      else this.failed.push(file.key);
    });

    this.load.image('tiles', 'assets/tilesets/feria.png');
    // Loaded as a spritesheet so its HUD icons can be used as frames as well as map tiles.
    this.load.spritesheet('tiles-custom', 'assets/tilesets/feria-custom.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    this.load.image('tiles-projects', 'assets/tilesets/feria-projects.png');
    this.load.image('vignette', 'assets/sprites/vignette.png');
    this.load.spritesheet('player', 'assets/sprites/player.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    this.load.spritesheet('npc', 'assets/sprites/npc.png', { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    this.load.tilemapTiledJSON('feria', 'assets/maps/feria.json');
    for (const { mapKey, mapFile } of Object.values(interiors)) this.load.tilemapTiledJSON(mapKey, mapFile);
    for (const [key, file] of Object.entries(AUDIO)) this.load.audio(key, file);
  }

  create(): void {
    // A missing file can also come back as an HTML fallback page that fails to parse without a
    // loaderror event, so check the caches as well.
    const missing = [
      ...this.failed,
      ...(['tiles', 'tiles-custom', 'tiles-projects', 'vignette', 'player', 'npc'] as const).filter((k) => !this.textures.exists(k)),
      ...['feria', ...Object.values(interiors).map((i) => i.mapKey)].filter((k) => !this.cache.tilemap.exists(k)),
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
