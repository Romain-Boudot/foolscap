import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { evaluateDoc } from "./evaluator";
import { findVariableNames } from "./parser";

const IDENT_RE = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
const HEADING_RE = /^\s*#{1,6}\s/;

class ResultWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly isError: boolean,
    readonly title: string | null,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = this.isError
      ? "cm-math-result cm-math-error"
      : "cm-math-result";
    span.textContent = this.text;
    if (this.title) span.title = this.title;
    return span;
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof ResultWidget &&
      other.text === this.text &&
      other.isError === this.isError &&
      other.title === this.title
    );
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const doc = view.state.doc;
  const docText = doc.toString();
  const results = evaluateDoc(docText);
  const variables = findVariableNames(docText);
  const builder = new RangeSetBuilder<Decoration>();

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const line = doc.line(i + 1);
    const text = line.text;
    const isHeading = HEADING_RE.test(text);

    // 1. Error mark (covers the whole expression range when present).
    if (r.error !== null) {
      const startNonWs = text.search(/\S/);
      if (startNonWs >= 0) {
        builder.add(
          line.from + startNonWs,
          line.to,
          Decoration.mark({
            class: "cm-math-error-mark",
            attributes: { title: r.error },
          }),
        );
      }
    }

    // 2. Variable name highlights (definitions + references), unless this
    //    line is already styled as a markdown heading.
    if (!isHeading && variables.size > 0) {
      IDENT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = IDENT_RE.exec(text)) !== null) {
        if (variables.has(m[0])) {
          builder.add(
            line.from + m.index,
            line.from + m.index + m[0].length,
            Decoration.mark({ class: "cm-math-var" }),
          );
        }
      }
    }

    // 3. Result / error widget at end of the line.
    if (r.display !== null || r.error !== null) {
      const widgetText = r.error ? " ⚠" : ` ${r.display}`;
      const widget = new ResultWidget(widgetText, r.error !== null, r.error);
      builder.add(line.to, line.to, Decoration.widget({ widget, side: 1 }));
    }
  }
  return builder.finish();
}

/** Dispatch this effect to force a re-evaluation of the document
 *  (e.g. after currency rates have changed). */
export const refreshMathEffect = StateEffect.define<null>();

export const mathExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      let rebuild = update.docChanged;
      if (!rebuild) {
        for (const tr of update.transactions) {
          for (const e of tr.effects) {
            if (e.is(refreshMathEffect)) {
              rebuild = true;
              break;
            }
          }
          if (rebuild) break;
        }
      }
      if (rebuild) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
