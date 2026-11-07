import { describe, expect, it } from 'vitest';
import { projectCard } from '../src/content/projectText';
import { projects } from '../src/content/projects';

describe('author content', () => {
  it('sends the Caseta-musica jukebox to its own repo', () => {
    expect(projects.caseta.links).toEqual([{ label: 'Caseta-musica on GitHub', url: 'https://github.com/alblopnov/Caseta-musica' }]);
  });

  it('gives Contact an email link, LinkedIn and GitHub', () => {
    const urls = projects.contact.links.map((l) => l.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        'mailto:a.lopezbenjumea@gmail.com',
        'https://www.linkedin.com/in/alopezbenjumea/',
        'https://github.com/alblopnov',
      ]),
    );
  });

  it('shows the email address, not the mailto scheme, on the Contact card', () => {
    const card = projectCard(projects.contact);
    expect(card).toContain('a.lopezbenjumea@gmail.com');
    expect(card).not.toContain('mailto:');
  });

  it('introduces the author as a Software Engineer II in Dublin, Ireland', () => {
    expect(projects.about.summary).toContain('Alberto López-Benjumea');
    expect(projects.about.summary).toContain('Software Engineer II');
    expect(projects.about.summary).toContain('Dublin, Ireland');
  });

  it('links Action Detection to its TFG codebase and keeps the other CV projects link-free', () => {
    expect(projects['action-detection'].links).toEqual([{ label: 'TFG-codebase on GitHub', url: 'https://github.com/alblopnov/TFG-codebase' }]);
    expect(projects['volunteer-pwa'].links).toEqual([]);
    expect(projects['secure-voting'].links).toEqual([]);
  });

  it('has the Contact card give the name before saying where the author is based', () => {
    const text = projects.contact.summary;
    expect(text).toContain('Alberto López-Benjumea');
    expect(text.indexOf('Alberto López-Benjumea')).toBeLessThan(text.indexOf('Dublin'));
  });

  it('does not publish a phone number or name an employer', () => {
    const all = JSON.stringify(projects);
    expect(all).not.toMatch(/\+\d{2}\s?\d{2}/);
    expect(all).not.toContain('Aon');
  });
});
