import { describe, expect, it } from 'vitest';
import { controlsHelp, HelpVisibility } from '../src/systems/controlsHelp';

describe('controlsHelp', () => {
  it('lists the keyboard controls, including the H toggle', () => {
    const rows = controlsHelp(false);
    const keys = rows.map((r) => r.keys);
    expect(keys).toEqual(expect.arrayContaining(['Arrows / WASD', 'Z / Enter', 'M', 'H']));
    expect(rows.every((r) => r.label.trim() !== '')).toBe(true);
  });

  it('says walking into a door enters it, in both modes, and keeps Z for talking and reading', () => {
    for (const touch of [false, true]) {
      const rows = controlsHelp(touch);
      expect(rows).toContainEqual({ keys: 'Walk into a door', label: 'Enter' });
      const action = rows.find((r) => r.keys === 'Z / Enter' || r.keys === 'A button');
      expect(action?.label).not.toMatch(/enter/i);
    }
  });

  it('lists the touch controls without keyboard keys', () => {
    const rows = controlsHelp(true);
    const keys = rows.map((r) => r.keys);
    expect(keys).toEqual(expect.arrayContaining(['Drag the left side', 'A button', 'Speaker']));
    expect(keys).not.toContain('H');
    expect(keys).not.toContain('Z / Enter');
  });
});

describe('HelpVisibility', () => {
  it('starts open', () => {
    expect(new HelpVisibility().isOpen()).toBe(true);
  });

  it('folds itself up once automatically', () => {
    const v = new HelpVisibility();
    v.autoCollapse();
    expect(v.isOpen()).toBe(false);
  });

  it('reopens on toggle and never auto-collapses again after a manual toggle', () => {
    const v = new HelpVisibility();
    v.autoCollapse();
    v.toggle();
    expect(v.isOpen()).toBe(true);
    v.autoCollapse();
    expect(v.isOpen()).toBe(true);
  });

  it('does not auto-collapse after the player has toggled it themselves', () => {
    const v = new HelpVisibility();
    v.toggle();
    v.toggle();
    v.autoCollapse();
    expect(v.isOpen()).toBe(true);
  });

  it('closes for good with close(), so a later auto-collapse changes nothing', () => {
    const v = new HelpVisibility();
    v.close();
    expect(v.isOpen()).toBe(false);
    v.autoCollapse();
    expect(v.isOpen()).toBe(false);
  });

  it('can be reopened with toggle() after close()', () => {
    const v = new HelpVisibility();
    v.close();
    v.toggle();
    expect(v.isOpen()).toBe(true);
  });
});
