export type ParsedLine =
  | { kind: "blank" }
  | { kind: "comment" }
  | { kind: "text" }
  | { kind: "assignment"; name: string; expr: string }
  | { kind: "query"; expr: string };

const ASSIGNMENT_RE = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)\s*$/;

export function parseLine(raw: string): ParsedLine {
  const trimmed = raw.trim();
  if (trimmed === "") return { kind: "blank" };
  if (trimmed.startsWith("#")) return { kind: "comment" };

  if (trimmed.endsWith("=")) {
    const expr = trimmed.slice(0, -1).trim();
    if (expr === "") return { kind: "blank" };
    return { kind: "query", expr };
  }

  const m = ASSIGNMENT_RE.exec(raw);
  if (m) return { kind: "assignment", name: m[1], expr: m[2] };

  return { kind: "text" };
}

/** Collects the names of all variables defined (via assignment) anywhere
 *  in the document. Used to colorize references at any position. */
export function findVariableNames(doc: string): Set<string> {
  const names = new Set<string>();
  for (const line of doc.split("\n")) {
    const parsed = parseLine(line);
    if (parsed.kind === "assignment") names.add(parsed.name);
  }
  return names;
}
