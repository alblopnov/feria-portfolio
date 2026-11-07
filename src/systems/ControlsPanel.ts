import { controlsHelp, HelpVisibility } from './controlsHelp';

const STYLE = {
  box:
    'position:fixed;z-index:5;box-sizing:border-box;font-family:monospace;color:#2e1d12;line-height:1.35;' +
    'background:#f6f1e4;border:2px solid #2e1d12;outline:1px solid #c8302c;outline-offset:-5px;border-radius:5px;' +
    'box-shadow:0 3px 0 rgba(0,0,0,0.35)',
  title: 'margin:0 0 0.35em;font-weight:bold;color:#8f1f1c',
  table: 'border-collapse:collapse',
  keys: 'padding:0.1em 0.7em 0.1em 0;font-weight:bold;white-space:nowrap;vertical-align:top',
  label: 'padding:0.1em 0',
  chip: 'font:inherit;font-weight:bold;padding:0.25em 0.6em;background:#f6f1e4;color:#8f1f1c;cursor:pointer;border-radius:5px;border:2px solid #2e1d12',
};

const AUTO_COLLAPSE_MS = 10000;

/**
 * Cheat sheet in the top-left corner of the game canvas: open at first, then it folds into a small
 * "? Controls" chip after the first step or ten seconds. The chip, or the H key, brings it back.
 * It lives for the whole page, so scene changes never reset it.
 */
export class ControlsPanel {
  private readonly state = new HelpVisibility();
  private readonly box = document.createElement('div');

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly touch: boolean,
    stepEvents: { once(event: string, fn: () => void): unknown },
  ) {
    this.box.style.cssText = STYLE.box;
    document.body.append(this.box);
    this.render();
    this.place();
    window.addEventListener('resize', () => this.place());
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.place()).observe(canvas);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) this.toggle();
    });
    const collapse = () => {
      this.state.autoCollapse();
      this.render();
    };
    stepEvents.once('feria:step', collapse);
    window.setTimeout(collapse, AUTO_COLLAPSE_MS);
  }

  private toggle(): void {
    this.state.toggle();
    this.render();
  }

  private render(): void {
    this.box.replaceChildren();
    if (!this.state.isOpen()) {
      this.box.style.cssText = `${STYLE.box};padding:0`;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.style.cssText = STYLE.chip;
      chip.textContent = this.touch ? '? Controls' : '? Controls (H)';
      chip.setAttribute('aria-label', 'Show controls');
      chip.addEventListener('click', () => this.toggle());
      this.box.append(chip);
    } else {
      this.box.style.cssText = `${STYLE.box};padding:0.6em 0.8em`;
      this.box.setAttribute('role', 'region');
      this.box.setAttribute('aria-label', 'Controls');
      const title = document.createElement('p');
      title.style.cssText = STYLE.title;
      title.textContent = 'CONTROLS';
      const table = document.createElement('table');
      table.style.cssText = STYLE.table;
      for (const row of controlsHelp(this.touch)) {
        const tr = document.createElement('tr');
        const keys = document.createElement('td');
        keys.style.cssText = STYLE.keys;
        keys.textContent = row.keys;
        const label = document.createElement('td');
        label.style.cssText = STYLE.label;
        label.textContent = row.label;
        tr.append(keys, label);
        table.append(tr);
      }
      const hint = document.createElement('p');
      hint.style.cssText = 'margin:0.5em 0 0;font-size:0.9em;opacity:0.8';
      hint.textContent = 'Walk up to a door, sign or person to use it.';
      this.box.append(title, table, hint);
    }
    this.place();
  }

  private place(): void {
    const r = this.canvas.getBoundingClientRect();
    this.box.style.left = `${r.left + 6}px`;
    this.box.style.top = `${r.top + 6}px`;
    this.box.style.fontSize = `${Math.max(11, Math.min(16, r.width / 50))}px`;
  }
}
