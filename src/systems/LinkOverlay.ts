import type { Project } from '../content/projects';

export type SafeLink = { label: string; url: string };

/** The project's links that are safe to render as real anchors: https only, with a non-blank label. */
export function safeLinks(project: Project): SafeLink[] {
  return project.links.flatMap(({ label, url }) => {
    const text = (label ?? '').trim();
    if (!text) return [];
    try {
      return new URL(url).protocol === 'https:' ? [{ label: text, url }] : [];
    } catch {
      return []; // not an absolute URL
    }
  });
}

const STYLE = {
  panel:
    'position:fixed;z-index:10;box-sizing:border-box;padding:0.8em 1em;background:#f6f1e4;color:#2e1d12;' +
    'border:3px solid #2e1d12;outline:1px solid #c8302c;outline-offset:-6px;border-radius:6px;' +
    'font-family:monospace;box-shadow:0 4px 0 rgba(0,0,0,0.35)',
  title: 'margin:0 0 0.5em;font-size:1em;font-weight:bold',
  list: 'margin:0 0 0.7em;padding:0;list-style:none',
  link: 'display:inline-block;padding:0.35em 0;color:#8f1f1c;font-weight:bold;word-break:break-all',
  close: 'font:inherit;font-weight:bold;padding:0.3em 0.9em;background:#c8302c;color:#f6f1e4;border:2px solid #2e1d12;border-radius:4px;cursor:pointer',
};

/**
 * A small HTML panel over the game canvas listing a project's links as real, clickable (and
 * copyable) anchors. It sits in the middle of the canvas, clear of the touch A button.
 */
export class LinkOverlay {
  private panel: HTMLDivElement | null = null;
  private onClose: (() => void) | null = null;
  private readonly reposition = () => this.place();

  constructor(private readonly canvas: HTMLCanvasElement) {}

  isOpen(): boolean {
    return this.panel !== null;
  }

  /** Whether a DOM event came from inside the panel (so its own keys and taps are left alone). */
  contains(target: EventTarget | null): boolean {
    return !!this.panel && target instanceof Node && this.panel.contains(target);
  }

  open(title: string, links: SafeLink[], onClose: () => void = () => {}): void {
    this.close();
    if (links.length === 0) return;
    const panel = document.createElement('div');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `${title} links`);
    panel.style.cssText = STYLE.panel;

    const heading = document.createElement('p');
    heading.style.cssText = STYLE.title;
    heading.textContent = `${title}: links`;
    const list = document.createElement('ul');
    list.style.cssText = STYLE.list;
    for (const { label, url } of links) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = label;
      a.title = url;
      a.style.cssText = STYLE.link;
      const item = document.createElement('li');
      item.append(a);
      list.append(item);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close (Z)';
    close.style.cssText = STYLE.close;
    close.addEventListener('click', () => this.close());

    panel.append(heading, list, close);
    document.body.append(panel);
    this.panel = panel;
    this.onClose = onClose;
    this.place();
    window.addEventListener('resize', this.reposition);
  }

  close(): void {
    if (!this.panel) return;
    this.panel.remove();
    this.panel = null;
    window.removeEventListener('resize', this.reposition);
    const done = this.onClose;
    this.onClose = null;
    done?.();
  }

  private place(): void {
    if (!this.panel) return;
    const r = this.canvas.getBoundingClientRect();
    this.panel.style.left = `${r.left + r.width * 0.12}px`;
    this.panel.style.top = `${r.top + r.height * 0.18}px`;
    this.panel.style.width = `${r.width * 0.7}px`;
    this.panel.style.fontSize = `${Math.max(12, Math.min(20, r.width / 40))}px`;
  }
}
