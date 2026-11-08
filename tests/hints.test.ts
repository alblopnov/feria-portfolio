import { describe, expect, it } from 'vitest';
import { getProject } from '../src/content/projects';
import type { MapObject } from '../src/systems/mapObjects';
import { hasMarker, nameTagFor } from '../src/systems/hints';

const obj = (type: MapObject['type'], id = ''): MapObject => ({ id, type, tile: { x: 0, y: 0 } });
const building = (id: string) => obj('building', id);

describe('nameTagFor', () => {
  it('shows the project title in capitals for an unlocked building', () => {
    expect(nameTagFor(building('caseta'), getProject('caseta'))).toBe('CASETA-MUSICA');
  });

  it('marks a locked building as coming soon on a second line', () => {
    expect(nameTagFor(building('ml-classifier'), getProject('ml-classifier'))).toBe('ML CLASSIFIER\n(SOON)');
  });

  it('wraps a long project name onto two lines', () => {
    expect(nameTagFor(building('action-detection'), getProject('action-detection'))).toBe('ACTION\nDETECTION');
  });

  it('has no tag for non-buildings or buildings with an unknown project', () => {
    expect(nameTagFor(obj('npc'), undefined)).toBeNull();
    expect(nameTagFor(building('nope'), undefined)).toBeNull();
    expect(nameTagFor(building(''), undefined)).toBeNull();
  });
});

describe('hasMarker', () => {
  it('marks everything the player can use', () => {
    for (const type of ['building', 'door', 'npc', 'sign', 'jukebox', 'bookshelf', 'desk', 'exhibit'] as const) {
      expect(hasMarker(obj(type))).toBe(true);
    }
  });

  it('does not mark spawn points or exits', () => {
    expect(hasMarker(obj('spawn'))).toBe(false);
    expect(hasMarker(obj('exit'))).toBe(false);
  });
});
