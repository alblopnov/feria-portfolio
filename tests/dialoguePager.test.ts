import { describe, expect, it } from 'vitest';
import { paginate } from '../src/systems/dialoguePager';

const withinLimits = (pages: string[], maxChars: number, maxLines: number) =>
  pages.every((page) => {
    const lines = page.split('\n');
    return lines.length <= maxLines && lines.every((l) => l.length <= maxChars);
  });

describe('paginate', () => {
  it('keeps short text on one page', () => {
    expect(paginate('Hola feria', 30, 3)).toEqual(['Hola feria']);
  });

  it('splits long text into pages that respect the limits and keep every word', () => {
    const text = 'la feria de abril se celebra en Sevilla con casetas farolillos y mucha musica '.repeat(3).trim();
    const pages = paginate(text, 30, 3);
    expect(pages.length).toBeGreaterThan(1);
    expect(withinLimits(pages, 30, 3)).toBe(true);
    expect(pages.join(' ').split(/\s+/)).toEqual(text.split(/\s+/));
  });

  it('hard-splits a single word longer than a line', () => {
    const pages = paginate('x'.repeat(100), 30, 3);
    expect(withinLimits(pages, 30, 3)).toBe(true);
    expect(pages.join('').replace(/\n/g, '')).toBe('x'.repeat(100));
  });

  it('returns one empty page for empty or whitespace-only text', () => {
    expect(paginate('', 30, 3)).toEqual(['']);
    expect(paginate('   ', 30, 3)).toEqual(['']);
  });
});
