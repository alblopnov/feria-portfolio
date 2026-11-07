import { describe, expect, it } from 'vitest';
import { getProject } from '../src/content/projects';
import { entersOnWalkIn } from '../src/systems/doors';
import type { MapObject } from '../src/systems/mapObjects';

const obj = (type: MapObject['type'], id = ''): MapObject => ({ id, type, tile: { x: 0, y: 0 } });

describe('entersOnWalkIn', () => {
  it('enters every unlocked caseta that has a room', () => {
    for (const id of ['caseta', 'about', 'action-detection', 'volunteer-pwa', 'secure-voting']) {
      expect(entersOnWalkIn(obj('building', id), getProject(id))).toBe(true);
    }
  });

  it('also works for door objects', () => {
    expect(entersOnWalkIn(obj('door', 'caseta'), getProject('caseta'))).toBe(true);
  });

  it('does not enter locked casetas, which only show their teaser', () => {
    expect(entersOnWalkIn(obj('building', 'ml-classifier'), getProject('ml-classifier'))).toBe(false);
  });

  it('does not enter the Contact post box, which has no room', () => {
    expect(entersOnWalkIn(obj('building', 'contact'), getProject('contact'))).toBe(false);
  });

  it('does not enter a building whose project id is unknown', () => {
    expect(entersOnWalkIn(obj('building', 'nope'), undefined)).toBe(false);
  });

  it('never triggers on people, signs or furniture', () => {
    for (const type of ['npc', 'sign', 'jukebox', 'bookshelf', 'desk', 'exhibit', 'exit', 'spawn'] as const) {
      expect(entersOnWalkIn(obj(type, 'caseta'), getProject('caseta'))).toBe(false);
    }
  });
});
