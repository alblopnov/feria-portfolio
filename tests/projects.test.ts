import { describe, expect, it } from 'vitest';
import { findMissingIds, getProject, projects } from '../src/content/projects';

describe('projects', () => {
  it('defines the six v1 buildings', () => {
    for (const id of ['caseta', 'about', 'contact', 'ml-classifier', 'java-service', 'dashboard']) {
      expect(projects[id]?.id).toBe(id);
    }
  });

  it('unlocks caseta, about and contact', () => {
    for (const id of ['caseta', 'about', 'contact']) {
      expect(projects[id].locked).toBe(false);
    }
  });

  it('locks the upcoming projects and gives each a teaser', () => {
    for (const id of ['ml-classifier', 'java-service', 'dashboard']) {
      expect(projects[id].locked).toBe(true);
      expect(projects[id].teaser.trim()).not.toBe('');
    }
  });

  it('opens the three CV projects, each in its own room', () => {
    const titles = { 'action-detection': 'Action Detection', 'volunteer-pwa': 'Volunteer PWA', 'secure-voting': 'Secure Voting' };
    for (const [id, title] of Object.entries(titles)) {
      const p = projects[id];
      expect(p?.id, id).toBe(id);
      expect(p.title).toBe(title);
      expect(p.locked).toBe(false);
      expect(p.teaser).toBe('');
      expect(p.interior).toBe(id);
      expect(p.summary.trim()).not.toBe('');
      expect(p.tech.length).toBeGreaterThan(0);
    }
  });

  it('gives every unlocked interior a summary', () => {
    for (const p of Object.values(projects)) {
      if (!p.locked && p.interior) expect(p.summary.trim()).not.toBe('');
    }
  });

  it('looks up a project by id and returns undefined for unknown ids', () => {
    expect(getProject('caseta')?.title).toBeTruthy();
    expect(getProject('nope')).toBeUndefined();
  });

  it('reports missing ids including the empty string', () => {
    expect(findMissingIds(['caseta', 'nope', ''])).toEqual(['nope', '']);
  });
});
