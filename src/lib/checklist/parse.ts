const TASK_RE = /^(\s*)\[([ xX])\](?=\s|$)/;

export type TaskMatch = {
  indent: string;
  done: boolean;
  /** Offset within the line where "[" begins. */
  markerStart: number;
  /** Offset within the line where "]" ends (exclusive). */
  markerEnd: number;
};

export function parseTaskLine(lineText: string): TaskMatch | null {
  const m = TASK_RE.exec(lineText);
  if (!m) return null;
  return {
    indent: m[1],
    done: m[2].toLowerCase() === "x",
    markerStart: m[1].length,
    markerEnd: m[1].length + 3,
  };
}

export function countTasks(content: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const line of content.split("\n")) {
    const t = parseTaskLine(line);
    if (!t) continue;
    total += 1;
    if (t.done) done += 1;
  }
  return { done, total };
}
