/** Greedy word-wraps `text` into pages of at most `maxLines` lines of at most `maxCharsPerLine` characters. */
export function paginate(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  const flush = () => {
    if (current) lines.push(current);
    current = '';
  };

  for (const word of words) {
    let rest = word;
    while (rest.length > maxCharsPerLine) {
      flush();
      lines.push(rest.slice(0, maxCharsPerLine));
      rest = rest.slice(maxCharsPerLine);
    }
    if (!current) current = rest;
    else if (current.length + 1 + rest.length <= maxCharsPerLine) current += ' ' + rest;
    else {
      flush();
      current = rest;
    }
  }
  flush();

  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    pages.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return pages;
}
