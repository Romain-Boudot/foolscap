import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { parseTaskLine } from "./parse";

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const task = parseTaskLine(line.text);
      if (task) {
        builder.add(
          line.from,
          line.from,
          Decoration.line({
            class: task.done ? "cm-task cm-task-done" : "cm-task",
          }),
        );
        builder.add(
          line.from + task.markerStart,
          line.from + task.markerEnd,
          Decoration.mark({
            class: task.done ? "cm-task-marker cm-task-marker-done" : "cm-task-marker",
          }),
        );
      }
      if (line.to + 1 > to) break;
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

export const checklistExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = build(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
