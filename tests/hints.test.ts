import { describe, expect, it } from 'vitest';
import { getProject } from '../src/content/projects';
import type { MapObject } from '../src/systems/mapObjects';
import { hasMarker, nameTagFor, promptFor } from '../src/systems/hints';

const obj = (type: MapObject['type'], id = ''): MapObject => ({ id, type, tile: { x: 0, y: 0 } });
const building = (id: string) => obj('building', id);

describe('promptFor', () => {
  it('offers to enter an unlocked building with a room', () => {
    expect(promptFor(building('caseta'), getProject('caseta'), false)).toBe('Z · Enter Caseta-musica');
  });

  it('uses the A button label on touch devices', () => {
    expect(promptFor(building('caseta'), getProject('caseta'), true)).toBe('A · Enter Caseta-musica');
  });

  it('offers a look at a locked caseta', () => {
    expect(promptFor(building('ml-classifier'), getProject('ml-classifier'), false)).toBe('Z · Look at ML Classifier');
  });

  it('offers to read an unlocked project without a room', () => {
    expect(promptFor(building('contact'), getProject('contact'), false)).toBe('Z · Read Contact');
  });

  it('falls back to a plain look when the project id is unknown', () => {
    expect(promptFor(building('nope'), undefined, false)).toBe('Z · Look');
  });

  it('names the action for people, signs and furniture', () => {
    expect(promptFor(obj('npc'), undefined, false)).toBe('Z · Talk');
    expect(promptFor(obj('sign'), undefined, false)).toBe('Z · Read sign');
    expect(promptFor(obj('jukebox', 'caseta'), getProject('caseta'), false)).toBe('Z · Use the jukebox');
    expect(promptFor(obj('bookshelf', 'about'), getProject('about'), false)).toBe('Z · Check the bookshelf');
    expect(promptFor(obj('desk', 'about'), getProject('about'), false)).toBe('Z · Check the desk');
  });

  it('has no prompt for spawn points and exits', () => {
    expect(promptFor(obj('spawn'), undefined, false)).toBeNull();
    expect(promptFor(obj('exit'), undefined, false)).toBeNull();
  });
});

describe('nameTagFor', () => {
  it('shows the project title in capitals for an unlocked building', () => {
    expect(nameTagFor(building('caseta'), getProject('caseta'))).toBe('CASETA-MUSICA');
  });

  it('marks a locked building as coming soon on a second line', () => {
    expect(nameTagFor(building('ml-classifier'), getProject('ml-classifier'))).toBe('ML CLASSIFIER\n(SOON)');
  });

  it('has no tag for non-buildings or buildings with an unknown project', () => {
    expect(nameTagFor(obj('npc'), undefined)).toBeNull();
    expect(nameTagFor(building('nope'), undefined)).toBeNull();
    expect(nameTagFor(building(''), undefined)).toBeNull();
  });
});

describe('hasMarker', () => {
  it('marks everything the player can use', () => {
    for (const type of ['building', 'door', 'npc', 'sign', 'jukebox', 'bookshelf', 'desk'] as const) {
      expect(hasMarker(obj(type))).toBe(true);
    }
  });

  it('does not mark spawn points or exits', () => {
    expect(hasMarker(obj('spawn'))).toBe(false);
    expect(hasMarker(obj('exit'))).toBe(false);
  });
});
