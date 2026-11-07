import { describe, expect, it } from 'vitest';
import { MISSING_PROJECT_TEXT, projectCard, skillsText } from '../src/content/projectText';
import type { Project } from '../src/content/projects';

const project: Project = {
  id: 'x',
  title: 'Thing',
  summary: 'Does stuff.',
  tech: ['Python', 'Flask'],
  links: [{ label: 'Code', url: 'https://github.com/someone/thing' }],
  locked: false,
  teaser: '',
  interior: null,
};

describe('projectCard', () => {
  it('includes title, summary, tech and links', () => {
    const card = projectCard(project);
    expect(card).toContain('Thing');
    expect(card).toContain('Does stuff.');
    expect(card).toContain('Python, Flask');
    expect(card).toContain('Code: github.com/someone/thing');
  });

  it('omits empty tech and links sections', () => {
    const card = projectCard({ ...project, tech: [], links: [] });
    expect(card).not.toContain('Tech');
    expect(card).not.toContain('Links');
  });
});

describe('skillsText', () => {
  it('lists the tech', () => {
    expect(skillsText(project)).toContain('Python, Flask');
  });
});

it('has a missing-project placeholder', () => {
  expect(MISSING_PROJECT_TEXT).toBe('??? (missing project)');
});
