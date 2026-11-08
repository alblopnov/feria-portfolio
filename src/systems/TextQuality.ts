import Phaser from 'phaser';

/** Screen (CSS) pixels per game pixel at the moment: how much the canvas is magnified on this screen. */
export function screenScale(scale: Phaser.Scale.ScaleManager): number {
  return scale.displaySize.width / scale.gameSize.width;
}

/** Draws a text object at `resolution` with smooth filtering; pixelArt's nearest-neighbour sampling makes text jagged. */
export function sharpen(text: Phaser.GameObjects.Text, resolution: number): void {
  text.setResolution(resolution);
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
}
