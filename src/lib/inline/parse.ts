export type InlineKind = "bold" | "italic" | "code";

export type InlineSpan = {
  start: number;
  end: number;
  kind: InlineKind;
  markerLen: number;
};

const RE_CODE = /`([^`\n]+)`/g;
const RE_BOLD = /\*\*([^*\n]+)\*\*/g;
const RE_ITALIC_STAR = /(?<!\*)\*([^*\n]+)\*(?!\*)/g;
const RE_ITALIC_UNDER = /(?<![\w_])_([^_\n]+)_(?![\w_])/g;

/**
 * Find inline markdown spans (bold, italic, code) in a line.
 * Code wins over bold/italic; bold wins over italic. Overlapping matches in
 * lower-priority passes are discarded. Returns spans sorted by `start`.
 */
export function findInlineSpans(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const used = new Uint8Array(text.length);

  const isUsed = (s: number, e: number): boolean => {
    for (let i = s; i < e; i++) if (used[i]) return true;
    return false;
  };
  const markUsed = (s: number, e: number): void => {
    for (let i = s; i < e; i++) used[i] = 1;
  };

  function scan(re: RegExp, kind: InlineKind, markerLen: number): void {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const s = m.index;
      const e = s + m[0].length;
      if (!isUsed(s, e)) {
        spans.push({ start: s, end: e, kind, markerLen });
        markUsed(s, e);
      }
    }
  }

  scan(RE_CODE, "code", 1);
  scan(RE_BOLD, "bold", 2);
  scan(RE_ITALIC_STAR, "italic", 1);
  scan(RE_ITALIC_UNDER, "italic", 1);

  spans.sort((a, b) => a.start - b.start);
  return spans;
}
