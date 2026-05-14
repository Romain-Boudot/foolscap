import { EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { parseTaskLine } from "./parse";

/**
 * On a task line: flip the marker between `[ ]` and `[x]`.
 * On any other line: prepend `[ ] ` after the leading whitespace.
 * Returns true (handled).
 */
export function toggleTaskCommand(view: EditorView): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.head);
    const task = parseTaskLine(line.text);
    if (task) {
      const charPos = line.from + task.markerStart + 1; // position of " " or "x"
      const newChar = task.done ? " " : "x";
      return {
        changes: { from: charPos, to: charPos + 1, insert: newChar },
        range,
      };
    }
    const indentLen = (/^\s*/.exec(line.text)?.[0] ?? "").length;
    const insertPos = line.from + indentLen;
    const insertText = "[ ] ";
    const newHead =
      range.head >= insertPos ? range.head + insertText.length : range.head;
    return {
      changes: { from: insertPos, insert: insertText },
      range: EditorSelection.cursor(newHead),
    };
  });
  view.dispatch(tr);
  return true;
}
