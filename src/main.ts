import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { InteriorScene } from './scenes/InteriorScene';
import { WorldScene } from './scenes/WorldScene';
import { ControlsPanel } from './systems/ControlsPanel';
import { isTouchDevice } from './systems/touchControls';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  // Two touch points: a thumb on the stick and another on the A button.
  input: { activePointers: 2 },
  backgroundColor: '#1b1209',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, WorldScene, InteriorScene],
});

// The cheat sheet lives on the page, not in a scene, so it survives every door.
const mountControls = () => new ControlsPanel(game.canvas, isTouchDevice(), game.events);
if (game.isBooted) mountControls();
else game.events.once(Phaser.Core.Events.READY, mountControls);
