import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { findInlineSpans } from "./parse";

function build(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const spans = findInlineSpans(line.text);
      for (const s of spans) {
        const lineOff = line.from;
        const openStart = lineOff + s.start;
        const openEnd = openStart + s.markerLen;
        const closeStart = lineOff + s.end - s.markerLen;
        const closeEnd = lineOff + s.end;
        builder.add(
          openStart,
          openEnd,
          Decoration.mark({ class: "cm-md-marker" }),
        );
        if (closeStart > openEnd) {
          builder.add(
            openEnd,
            closeStart,
            Decoration.mark({ class: `cm-md-${s.kind}` }),
          );
        }
        builder.add(
          closeStart,
          closeEnd,
          Decoration.mark({ class: "cm-md-marker" }),
        );
      }
      if (line.to + 1 > to) break;
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

export const inlineMarkdownExtension = ViewPlugin.fromClass(
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
