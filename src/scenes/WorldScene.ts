import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { projectCard } from '../content/projectText';
import { getProject } from '../content/projects';
import { entersOnWalkIn } from '../systems/doors';
import { playDoorExit, playDoorOpen } from '../systems/DoorAnimation';
import { doorTiming, prefersReducedMotion } from '../systems/doorTiming';
import type { Direction, Tile } from '../systems/gridMovement';
import type { MapObject } from '../systems/mapObjects';
import { playSfx } from '../systems/sound';
import { DEPTH, FRAME_ROW, GridScene, OPPOSITE } from './GridScene';
import type { InteriorData } from './InteriorScene';

/** Number of NPC looks (rows) in npc.png, drawn by tools/gen-assets.mjs. */
const NPC_LOOKS = 3;

/** doorTile: the door the player just left a room through, so it can swing shut behind them. */
export type WorldData = { spawnTile?: Tile; facing?: Direction; doorTile?: Tile };

export class WorldScene extends GridScene {
  private spawnOverride: Tile | null = null;
  /** Set once a walk-in door has started the Interior scene, so one bump cannot start it twice. */
  private entering = false;
  private map!: Phaser.Tilemaps.Tilemap;
  private exitDoor: Tile | null = null;
  private npcs = new Map<MapObject, { sprite: Phaser.GameObjects.Sprite; look: number }>();

  constructor() {
    super('World');
  }

  init(data: WorldData): void {
    this.resetInput(data?.facing ?? 'up');
    this.spawnOverride = data?.spawnTile ?? null;
    this.exitDoor = data?.doorTile ?? null;
    this.entering = false;
  }

  create(): void {
    const map = this.buildMap('feria');
    this.map = map;

    this.npcs.clear();
    this.objects
      .filter((o) => o.type === 'npc')
      .forEach((npc, i) => {
        // npc.png has one row of four frames per look; NPCs take the looks in map order.
        const look = (i % NPC_LOOKS) * 4;
        const sprite = this.add.sprite(npc.tile.x * TILE_SIZE, npc.tile.y * TILE_SIZE, 'npc', look + FRAME_ROW.down).setOrigin(0, 0).setDepth(DEPTH.npc);
        this.npcs.set(npc, { sprite, look });
      });

    const spawn = this.objects.find((o) => o.type === 'spawn' && o.id === 'portada') ?? this.objects.find((o) => o.type === 'spawn');
    this.spawnPlayer(this.spawnOverride ?? spawn?.tile ?? { x: 1, y: 1 });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true);
    cam.setRoundPixels(true);

    if (this.exitDoor && this.spawnOverride) {
      // Coming out of a room: the player walks out of the open doorway and the door swings shut.
      this.inputLocked = true;
      playDoorExit(this, map, this.exitDoor, this.spawnOverride, this.player, doorTiming(prefersReducedMotion()), () => (this.inputLocked = false));
    }
  }

  protected onBump(obj: MapObject | undefined): void {
    if (obj && !this.entering && entersOnWalkIn(obj, getProject(obj.id))) this.enterBuilding(obj);
  }

  protected interact(obj: MapObject): void {
    if (obj.type === 'npc') {
      const npc = this.npcs.get(obj);
      npc?.sprite.setFrame(npc.look + FRAME_ROW[OPPOSITE[this.facing]]);
    }
    if (obj.type === 'npc' || obj.type === 'sign') {
      this.dialogue.show(obj.text ?? '');
      return;
    }
    if (obj.type === 'building' || obj.type === 'door') this.enterBuilding(obj);
  }

  /** Opens the door, walks the player in and fades out; `go` then starts the next scene. */
  private openDoorThen(obj: MapObject, go: () => void): void {
    this.entering = true;
    this.inputLocked = true;
    playSfx(this.game, 'door', { volume: 0.5 });
    const timing = doorTiming(prefersReducedMotion());
    playDoorOpen(this, this.map, obj.tile, this.player, timing, () => {
      const cam = this.cameras.main;
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, go);
      cam.fadeOut(timing.fadeOut, 0, 0, 0);
    });
  }

  private enterBuilding(obj: MapObject): void {
    const project = this.projectFor(obj);
    if (!project) return;
    if (project.locked) {
      this.dialogue.show(project.teaser);
    } else if (project.interior) {
      const data: InteriorData = { interiorId: project.interior, returnTile: { ...this.pos }, doorTile: { ...obj.tile } };
      this.openDoorThen(obj, () => this.scene.start('Interior', data));
    } else {
      // Unlocked with no room, like the Contact post box: show its card right here.
      this.showWithLinks(projectCard(project), project);
    }
  }
}
