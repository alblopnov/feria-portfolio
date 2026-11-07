export type HelpRow = { keys: string; label: string };

const ACTION = 'Talk, read, next page';
const ENTER = { keys: 'Walk into a door', label: 'Enter' };

/** The cheat-sheet rows for keyboard or touch play. */
export function controlsHelp(touch: boolean): HelpRow[] {
  if (touch) {
    return [
      { keys: 'Drag the left side', label: 'Walk' },
      ENTER,
      { keys: 'A button', label: ACTION },
      { keys: 'Speaker', label: 'Mute' },
    ];
  }
  return [
    { keys: 'Arrows / WASD', label: 'Walk' },
    ENTER,
    { keys: 'Z / Enter', label: ACTION },
    { keys: 'M', label: 'Mute' },
    { keys: 'H', label: 'Hide or show this help' },
  ];
}

/** Open/folded state of the cheat sheet: it folds itself once, and never again after the player takes over. */
export class HelpVisibility {
  private open = true;
  private manual = false;

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.manual = true;
    this.open = !this.open;
  }

  autoCollapse(): void {
    if (!this.manual) this.open = false;
  }
}
