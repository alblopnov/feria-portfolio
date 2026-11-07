import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';

describe('index.html phone viewport', () => {
  it('sizes the game with 100dvh, keeping 100vh as a fallback declared first', () => {
    expect(html).toContain('100dvh');
    expect(html.indexOf('100vh')).toBeGreaterThan(-1);
    expect(html.indexOf('100vh')).toBeLessThan(html.indexOf('100dvh'));
  });

  it('stops the browser from panning, zooming and bouncing the page under touch', () => {
    expect(html).toContain('touch-action: none');
    expect(html).toContain('overscroll-behavior: none');
  });
});
