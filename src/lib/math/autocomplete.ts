import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { findVariableNames } from "./parser";
import { CURRENCY_CODES } from "./currencies";

const SECTION_VARIABLES = { name: "Variables", rank: 1 };
const SECTION_AGGREGATES = { name: "Aggregates", rank: 2 };
const SECTION_FUNCTIONS = { name: "Functions", rank: 3 };
const SECTION_CURRENCIES = { name: "Currencies", rank: 4 };
const SECTION_CONVERSION = { name: "Conversion", rank: 5 };

const AGGREGATES: Completion[] = [
  { label: "sum", type: "function", info: "Sum of all numeric variables" },
  { label: "total", type: "function", info: "Alias for sum" },
  { label: "avg", type: "function", info: "Average of all numeric variables" },
  { label: "mean", type: "function", info: "Alias for avg" },
  { label: "median", type: "function", info: "Median of all numeric variables" },
  { label: "min", type: "function", info: "Min of all numeric variables" },
  { label: "max", type: "function", info: "Max of all numeric variables" },
  { label: "range", type: "function", info: "max − min" },
  { label: "count", type: "function", info: "Number of numeric variables" },
  { label: "std", type: "function", info: "Standard deviation" },
  { label: "stddev", type: "function", info: "Alias for std" },
  { label: "variance", type: "function", info: "Variance" },
].map((c) => ({ ...c, section: SECTION_AGGREGATES }));

const FUNCTIONS: Completion[] = [
  { label: "sqrt", type: "function", info: "Square root" },
  { label: "abs", type: "function", info: "Absolute value" },
  { label: "round", type: "function", info: "Round to nearest integer" },
  { label: "ceil", type: "function", info: "Round up" },
  { label: "floor", type: "function", info: "Round down" },
  { label: "log", type: "function", info: "Natural log" },
  { label: "log10", type: "function", info: "Base-10 log" },
  { label: "exp", type: "function", info: "Exponential e^x" },
  { label: "sin", type: "function", info: "Sine (radians)" },
  { label: "cos", type: "function", info: "Cosine (radians)" },
  { label: "tan", type: "function", info: "Tangent (radians)" },
  { label: "pow", type: "function", info: "pow(x, y) = x^y" },
].map((c) => ({ ...c, section: SECTION_FUNCTIONS }));

const CURRENCIES: Completion[] = [...CURRENCY_CODES].map((code) => ({
  label: code,
  type: "constant",
  section: SECTION_CURRENCIES,
}));

const CONVERSION: Completion[] = [
  { label: "to", type: "keyword", info: "Convert: 5 km to mi" },
  { label: "into", type: "keyword", info: "Convert: 5 km into mi" },
  { label: "en", type: "keyword", info: "Convert (FR): 5 km en mi" },
  { label: "vers", type: "keyword", info: "Convert (FR): 5 km vers mi" },
].map((c) => ({ ...c, section: SECTION_CONVERSION }));

const STATIC_OPTIONS: Completion[] = [
  ...AGGREGATES,
  ...FUNCTIONS,
  ...CURRENCIES,
  ...CONVERSION,
];

const TIMER_LINE_RE = /^\s*(timer|every|at|pomodoro)\b/;
const HEADING_LINE_RE = /^\s*#{1,6}\s/;
const TASK_MARKER_RE = /^\s*\[[ xX]\]\s/;

/** Math-aware autocomplete: suggests user-defined variables first, then
 *  currency codes, aggregates, functions, and conversion keywords. Skips
 *  heading lines and timer-syntax lines where these wouldn't make sense. */
export function mathCompletions(
  context: CompletionContext,
): CompletionResult | null {
  const word = context.matchBefore(/\w+/);
  if (!word) return null;
  // Only auto-trigger when the user has typed at least one char; allow
  // explicit Ctrl+Space to open even on an empty prefix.
  if (word.from === word.to && !context.explicit) return null;

  const line = context.state.doc.lineAt(context.pos);
  const lineText = line.text;
  if (HEADING_LINE_RE.test(lineText)) return null;
  if (TIMER_LINE_RE.test(lineText)) return null;

  // Inside a task line we still want completion in the text part, but
  // not while typing the marker itself.
  const beforeWord = lineText.slice(0, word.from - line.from);
  if (TASK_MARKER_RE.test(lineText) && !/\[[ xX]\]\s/.test(beforeWord)) {
    return null;
  }

  const doc = context.state.doc.toString();
  const vars = findVariableNames(doc);
  // Don't suggest the variable that we're currently in the middle of
  // defining (the LHS of an assignment on the active line).
  const lhsMatch = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/.exec(lineText);
  if (lhsMatch && word.from === line.from + lineText.indexOf(lhsMatch[1])) {
    vars.delete(lhsMatch[1]);
  }

  const variableOptions: Completion[] = [...vars].map((v) => ({
    label: v,
    type: "variable",
    section: SECTION_VARIABLES,
    boost: 10,
  }));

  return {
    from: word.from,
    options: [...variableOptions, ...STATIC_OPTIONS],
    validFor: /^\w*$/,
  };
}
