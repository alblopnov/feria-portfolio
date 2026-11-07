import type { Project } from './projects';

export const MISSING_PROJECT_TEXT = '??? (missing project)';

const shortUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** The project card shown in the dialogue box: title, summary, tech and links. */
export function projectCard(p: Project): string {
  const parts = [`${p.title}.`, p.summary];
  if (p.tech.length > 0) parts.push(`Tech: ${p.tech.join(', ')}.`);
  if (p.links.length > 0) parts.push(`Links: ${p.links.map((l) => `${l.label}: ${shortUrl(l.url)}`).join('; ')}.`);
  return parts.filter((s) => s.trim().length > 0).join(' ');
}

/** What the About bookshelf says. */
export function skillsText(p: Project): string {
  return p.tech.length > 0 ? `The shelves are full of books on ${p.tech.join(', ')}.` : 'The shelves are still empty.';
}
