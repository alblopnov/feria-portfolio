import type { Project } from '../content/projects';
import type { MapObject } from './mapObjects';

const MARKED: ReadonlySet<MapObject['type']> = new Set(['building', 'door', 'npc', 'sign', 'jukebox', 'bookshelf', 'desk', 'exhibit']);

/** True for everything the player can walk up to and use (not spawn points or exits). */
export function hasMarker(obj: MapObject): boolean {
  return MARKED.has(obj.type);
}

function action(obj: MapObject, project: Project | undefined): string | null {
  switch (obj.type) {
    case 'building':
    case 'door':
      if (!project) return 'Look';
      if (project.locked) return `Look at ${project.title}`;
      return project.interior ? `Enter ${project.title}` : `Read ${project.title}`;
    case 'npc':
      return 'Talk';
    case 'sign':
      return 'Read sign';
    case 'jukebox':
      return 'Use the jukebox';
    case 'bookshelf':
      return 'Check the bookshelf';
    case 'desk':
      return 'Check the desk';
    case 'exhibit':
      return 'Look at the exhibit';
    default:
      return null;
  }
}

/** The bubble shown over the object the player is facing, e.g. "Z · Enter Caseta-musica". */
export function promptFor(obj: MapObject, project: Project | undefined, touch: boolean): string | null {
  const label = action(obj, project);
  return label === null ? null : `${touch ? 'A' : 'Z'} · ${label}`;
}

/** The name floating over a building; locked ones say they are coming soon. */
export function nameTagFor(obj: MapObject, project: Project | undefined): string | null {
  if ((obj.type !== 'building' && obj.type !== 'door') || !project) return null;
  const name = project.title.toUpperCase();
  return project.locked ? `${name}\n(SOON)` : name;
}
