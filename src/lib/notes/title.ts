function clean(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\[[ xX]\]\s+/, "")
    .trim();
}

/**
 * First non-empty line of the note, stripped of leading markdown markers
 * (heading hashes, task checkboxes). Returns "Untitled" for an empty note.
 */
export function noteTitle(content: string): string {
  for (const line of content.split("\n")) {
    if (line.trim()) {
      const c = clean(line);
      if (c) return c;
    }
  }
  return "Untitled";
}

/** Second non-empty line, cleaned. Empty string if there isn't one. */
export function notePreview(content: string): string {
  let seenFirst = false;
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    if (!seenFirst) {
      seenFirst = true;
      continue;
    }
    return clean(line);
  }
  return "";
}
