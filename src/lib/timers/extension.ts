import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { parseTimerLine, type TimerSpec } from "./parser";
import { ensureTimer } from "./manager";
import { formatTimerDisplay } from "./state";

/** Dispatch this effect to force the timer widgets to re-render
 *  (e.g. every second so the countdown ticks down). */
export const refreshTimerEffect = StateEffect.define<null>();

class TimerWidget extends WidgetType {
  readonly displayText: string;
  readonly cssKind: string;
  readonly isDone: boolean;

  constructor(noteId: string, lineText: string, spec: TimerSpec, now: number) {
    super();
    const active = ensureTimer(noteId, lineText);
    const info = active
      ? formatTimerDisplay(active, now)
      : { text: staticSpecText(spec), done: false };
    this.displayText = info.text;
    this.isDone = info.done;
    this.cssKind = `cm-timer-${spec.kind.replace("_", "-")}`;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = `cm-timer-widget ${this.cssKind}${this.isDone ? " cm-timer-done" : ""}`;
    span.textContent = this.displayText;
    return span;
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof TimerWidget &&
      other.displayText === this.displayText &&
      other.cssKind === this.cssKind &&
      other.isDone === this.isDone
    );
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function staticSpecText(spec: TimerSpec): string {
  const label = spec.label ? ` · ${spec.label}` : "";
  switch (spec.kind) {
    case "countdown":
      return ` ⏱ ${spec.durationSec}s${label}`;
    case "recurring":
      return ` ↻ every ${spec.intervalSec}s${label}`;
    case "at_time":
      return ` 🕒 ${spec.hour}:${String(spec.minute).padStart(2, "0")}${label}`;
    case "pomodoro":
      return ` 🍅 ${spec.workMin}/${spec.breakMin} ×${spec.rounds}${label}`;
  }
}

function build(view: EditorView, noteId: string): DecorationSet {
  const doc = view.state.doc;
  const builder = new RangeSetBuilder<Decoration>();
  const now = Date.now();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      const spec = parseTimerLine(line.text);
      if (spec) {
        const widget = new TimerWidget(noteId, line.text, spec, now);
        builder.add(line.to, line.to, Decoration.widget({ widget, side: 1 }));
      }
      if (line.to + 1 > to) break;
      pos = line.to + 1;
    }
  }
  return builder.finish();
}

export function timerExtension(noteId: string) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = build(view, noteId);
      }
      update(update: ViewUpdate) {
        let rebuild = update.docChanged || update.viewportChanged;
        if (!rebuild) {
          for (const tr of update.transactions) {
            for (const e of tr.effects) {
              if (e.is(refreshTimerEffect)) {
                rebuild = true;
                break;
              }
            }
            if (rebuild) break;
          }
        }
        if (rebuild) {
          this.decorations = build(update.view, noteId);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
