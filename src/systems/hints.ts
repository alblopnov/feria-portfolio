import type { Project } from '../content/projects';
import type { MapObject } from './mapObjects';

const MARKED: ReadonlySet<MapObject['type']> = new Set(['building', 'door', 'npc', 'sign', 'jukebox', 'bookshelf', 'desk', 'exhibit']);

/** True for everything the player can walk up to and use (not spawn points or exits). */
export function hasMarker(obj: MapObject): boolean {
  return MARKED.has(obj.type);
}

/** The name floating over a building; locked ones say they are coming soon. */
export function nameTagFor(obj: MapObject, project: Project | undefined): string | null {
  if ((obj.type !== 'building' && obj.type !== 'door') || !project) return null;
  const name = project.title.toUpperCase();
  return project.locked ? `${name}\n(SOON)` : name;
}
