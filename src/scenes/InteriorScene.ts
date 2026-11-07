import Phaser from 'phaser';
import { interiors } from '../content/interiors';
import { projectCard, skillsText } from '../content/projectText';
import type { Tile } from '../systems/gridMovement';
import type { MapObject } from '../systems/mapObjects';
import { doorTiming, prefersReducedMotion } from '../systems/doorTiming';
import { playSfx } from '../systems/sound';
import { GridScene } from './GridScene';
import type { WorldData } from './WorldScene';

export type InteriorData = { interiorId: string; returnTile: Tile; doorTile?: Tile };

/** One reusable room scene, built from whichever interior map the project points at. */
export class InteriorScene extends GridScene {
  private interiorId = '';
  private returnTile: Tile = { x: 0, y: 0 };
  private doorTile: Tile | undefined;
  private leaving = false;

  constructor() {
    super('Interior');
  }

  init(data: InteriorData): void {
    this.resetInput('up');
    this.interiorId = data.interiorId;
    this.returnTile = data.returnTile;
    this.doorTile = data.doorTile;
    this.leaving = false;
  }

  create(): void {
    const entry = interiors[this.interiorId];
    if (!entry || !this.cache.tilemap.exists(entry.mapKey)) {
      console.warn(`No interior map for ${JSON.stringify(this.interiorId)}; returning to the feria`);
      this.leave(false);
      return;
    }
    const map = this.buildMap(entry.mapKey);
    const spawn = this.objects.find((o) => o.type === 'spawn');
    this.spawnPlayer(spawn?.tile ?? { x: 1, y: 2 });

    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
  }

  protected onArrive(tile: Tile): void {
    if (this.objects.some((o) => o.type === 'exit' && o.tile.x === tile.x && o.tile.y === tile.y)) this.leave();
  }

  protected interact(obj: MapObject): void {
    if (obj.type === 'npc' || obj.type === 'sign') {
      this.dialogue.show(obj.text ?? '');
      return;
    }
    if (obj.type !== 'jukebox' && obj.type !== 'bookshelf' && obj.type !== 'desk' && obj.type !== 'exhibit') return;
    const project = this.projectFor(obj);
    if (!project) return;
    // The bookshelf lists skills; the jukebox, the desk and a project's exhibit show its card.
    if (obj.type === 'bookshelf') this.showWithLinks(skillsText(project), project);
    else this.showWithLinks(projectCard(project), project);
  }

  /** Steps out: the room fades to black, then the world starts with the player walking out of the door. */
  private leave(animate = true): void {
    if (this.leaving) return;
    this.leaving = true;
    this.inputLocked = true;
    playSfx(this.game, 'door', { volume: 0.5 });
    const data: WorldData = { spawnTile: this.returnTile, facing: 'down', doorTile: this.doorTile };
    const go = () => this.scene.start('World', data);
    if (!animate) {
      go();
      return;
    }
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
    cam.fadeOut(doorTiming(prefersReducedMotion()).leave, 0, 0, 0);
  }
}
