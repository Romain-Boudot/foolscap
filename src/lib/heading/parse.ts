const HEADING_RE = /^(\s*)(#{1,6})(?=\s)/;

export type HeadingMatch = {
  level: number;
  markerStart: number;
  markerEnd: number;
};

export function parseHeadingLine(text: string): HeadingMatch | null {
  const m = HEADING_RE.exec(text);
  if (!m) return null;
  return {
    level: m[2].length,
    markerStart: m[1].length,
    markerEnd: m[1].length + m[2].length,
  };
}
