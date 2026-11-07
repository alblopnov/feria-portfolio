import type { Project } from '../content/projects';
import type { MapObject } from './mapObjects';

/** True when walking into this object should take the player inside: an unlocked building with a room. */
export function entersOnWalkIn(obj: MapObject, project: Project | undefined): boolean {
  if (obj.type !== 'building' && obj.type !== 'door') return false;
  return !!project && !project.locked && project.interior !== null;
}
