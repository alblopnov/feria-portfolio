import { describe, expect, it } from 'vitest';
import { tagFontPx, textResolution, wrapTag } from '../src/systems/uiText';

describe('tagFontPx', () => {
  it('keeps name tags at least about 11 pixels tall on the screen', () => {
    expect(tagFontPx(1)).toBe(11);
    expect(tagFontPx(1.17)).toBe(10); // a phone: 10 game px * 1.17 = 11.7 screen px
    expect(tagFontPx(0.5)).toBe(13); // never huge, even on a tiny canvas
  });

  it('never goes below the pixel-art size on big screens', () => {
    expect(tagFontPx(2.5)).toBe(8);
    expect(tagFontPx(6)).toBe(8);
  });

  it('falls back to the small size for a nonsense scale', () => {
    for (const scale of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(tagFontPx(scale)).toBe(8);
  });
});

describe('textResolution', () => {
  it('renders text at the screen pixel density, so it is drawn 1:1', () => {
    expect(textResolution(1.17, 2)).toBe(3);
    expect(textResolution(2.5, 1)).toBe(3);
    expect(textResolution(3, 2)).toBe(6);
  });

  it('stays within a sensible range', () => {
    expect(textResolution(0.5, 1)).toBe(2);
    expect(textResolution(10, 3)).toBe(8);
    expect(textResolution(Number.NaN, 2)).toBe(4);
  });
});

describe('wrapTag', () => {
  it('leaves short names alone', () => {
    for (const name of ['ABOUT ME', 'CONTACT', 'DASHBOARD', 'CASETA-MUSICA', 'SECURE VOTING', 'ML CLASSIFIER']) {
      expect(wrapTag(name)).toBe(name);
    }
  });

  it('wraps a long name at the space nearest the middle', () => {
    expect(wrapTag('ACTION DETECTION')).toBe('ACTION\nDETECTION');
    expect(wrapTag('A VERY LONG PROJECT NAME')).toBe('A VERY LONG\nPROJECT NAME');
  });

  it('keeps a long name with no space on one line', () => {
    expect(wrapTag('SUPERCALIFRAGILISTIC')).toBe('SUPERCALIFRAGILISTIC');
  });
});
