import { describe, expect, it } from 'vitest';
import type { Project } from '../src/content/projects';
import { projects } from '../src/content/projects';
import { safeLinks } from '../src/systems/LinkOverlay';

const withLinks = (links: Project['links']): Project => ({ ...projects.caseta, links });

describe('safeLinks', () => {
  it('keeps https links', () => {
    expect(safeLinks(withLinks([{ label: 'GitHub', url: 'https://github.com/someone' }]))).toEqual([
      { label: 'GitHub', url: 'https://github.com/someone' },
    ]);
  });

  it('drops http:, javascript: and empty urls', () => {
    const links = [
      { label: 'Plain', url: 'http://example.com' },
      { label: 'Script', url: 'javascript:alert(1)' },
      { label: 'Empty', url: '' },
      { label: 'Not a url', url: 'github.com/someone' },
      { label: 'Ok', url: 'https://example.com/ok' },
    ];
    expect(safeLinks(withLinks(links))).toEqual([{ label: 'Ok', url: 'https://example.com/ok' }]);
  });

  it('drops links with an empty or blank label', () => {
    expect(safeLinks(withLinks([{ label: '  ', url: 'https://example.com' }, { label: '', url: 'https://example.org' }]))).toEqual([]);
  });

  it('gives an empty list for a project without links', () => {
    expect(safeLinks(withLinks([]))).toEqual([]);
  });
});
