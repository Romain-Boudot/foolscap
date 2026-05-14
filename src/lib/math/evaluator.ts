import {
  CURRENCY_CODES,
  formatMoney,
  preprocessExpression,
} from "./currencies";
import { math } from "./instance";
import { parseLine } from "./parser";

export type EvalResult = {
  display: string | null;
  /** Same value as `display` but without currency symbols, thousand separators,
   *  or unit-specific formatting — just the numeric magnitude. Used for raw
   *  clipboard copy when the user wants to paste the value into another
   *  calculation. */
  raw: string | null;
  error: string | null;
};

export function evaluateDoc(doc: string): EvalResult[] {
  const scope: Record<string, unknown> = {};
  const out: EvalResult[] = [];
  const lines = doc.split("\n");

  for (const raw of lines) {
    const parsed = parseLine(raw);
    if (
      parsed.kind === "blank" ||
      parsed.kind === "comment" ||
      parsed.kind === "text"
    ) {
      out.push({ display: null, raw: null, error: null });
      continue;
    }
    try {
      const expr = expandAggregates(
        expandGlobs(preprocessExpression(parsed.expr), scope),
        scope,
      );
      if (parsed.kind === "assignment") {
        scope[parsed.name] = math.evaluate(expr, scope);
        out.push({ display: null, raw: null, error: null });
      } else {
        const value = math.evaluate(expr, scope);
        out.push({
          display: formatResult(value),
          raw: formatRaw(value),
          error: null,
        });
      }
    } catch (err) {
      out.push({ display: null, raw: null, error: errorMessage(err) });
    }
  }

  return out;
}

function formatResult(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? math.format(value, { precision: 8 })
      : String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;

  const asMoney = tryFormatMoney(value);
  if (asMoney !== null) return asMoney;

  try {
    return math.format(value, { precision: 8 });
  } catch {
    return String(value);
  }
}

function tryFormatMoney(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;
  const toJSON = (value as { toJSON?: () => unknown }).toJSON;
  if (typeof toJSON !== "function") return null;
  let json: unknown;
  try {
    json = toJSON.call(value);
  } catch {
    return null;
  }
  if (typeof json !== "object" || json === null) return null;
  const j = json as { mathjs?: string; unit?: string; value?: number };
  if (j.mathjs !== "Unit" || typeof j.unit !== "string" || typeof j.value !== "number") {
    return null;
  }
  const code = j.unit.toUpperCase();
  if (!CURRENCY_CODES.has(code)) return null;
  return formatMoney(j.value, code);
}

const AGGREGATE_TYPES = new Set([
  "number",
  "BigNumber",
  "Fraction",
  "Unit",
]);

function aggregateVarNames(scope: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const k of Object.keys(scope)) {
    if (AGGREGATE_TYPES.has(math.typeOf(scope[k]))) out.push(k);
  }
  return out;
}

/** Expand standalone aggregate keywords (sum, avg, median, pNN, ...) into
 *  mathjs function calls over every numeric variable defined so far. A
 *  user-defined variable with the same name as a keyword wins — no
 *  substitution. Function call forms like `sum(a, b)` are left untouched. */
function expandAggregates(
  expr: string,
  scope: Record<string, unknown>,
): string {
  const vars = aggregateVarNames(scope);
  if (vars.length === 0) return expr;
  const list = vars.join(", ");
  const arr = `[${list}]`;
  const allVars = new Set(Object.keys(scope));

  let result = expr;

  const expand = (keyword: string, replacement: string): void => {
    if (allVars.has(keyword)) return;
    const re = new RegExp(`\\b${keyword}\\b(?!\\s*\\()`, "g");
    result = result.replace(re, replacement);
  };

  expand("sum", `sum(${list})`);
  expand("total", `sum(${list})`);
  expand("avg", `mean(${list})`);
  expand("mean", `mean(${list})`);
  expand("median", `median(${list})`);
  expand("min", `min(${list})`);
  expand("max", `max(${list})`);
  expand("count", String(vars.length));
  expand("std", `std(${list})`);
  expand("stddev", `std(${list})`);
  expand("variance", `variance(${list})`);
  expand("range", `(max(${list}) - min(${list}))`);

  result = result.replace(/\bp(\d{1,3})\b(?!\s*\()/g, (match, n) => {
    if (allVars.has(match)) return match;
    const p = parseInt(n, 10);
    if (p < 0 || p > 100) return match;
    return `quantileSeq(${arr}, ${p / 100})`;
  });

  return result;
}

const AGGREGATE_FUNCS = new Set([
  "sum",
  "total",
  "mean",
  "avg",
  "median",
  "min",
  "max",
  "std",
  "stddev",
  "variance",
]);

/** Inside aggregate function calls, expand glob patterns like `*_revenue`
 *  or `growth_*` into the comma-separated list of matching variable names.
 *  `*` matches any sequence of word chars; `?` matches exactly one. */
function expandGlobs(
  expr: string,
  scope: Record<string, unknown>,
): string {
  const allVars = Object.keys(scope);
  if (allVars.length === 0) return expr;

  return expr.replace(
    /(\w+)\s*\(([^()]*)\)/g,
    (match: string, fn: string, args: string) => {
      if (!AGGREGATE_FUNCS.has(fn.toLowerCase())) return match;
      if (!args.includes("*") && !args.includes("?")) return match;

      const newArgs = args
        .split(",")
        .map((arg) => {
          const trimmed = arg.trim();
          if (!trimmed.includes("*") && !trimmed.includes("?")) return trimmed;
          const re = globToRegex(trimmed);
          if (!re) return trimmed;
          const matched = allVars.filter((v) => re.test(v));
          return matched.join(", ");
        })
        .filter((s) => s !== "");

      return `${fn}(${newArgs.join(", ")})`;
    },
  );
}

function globToRegex(glob: string): RegExp | null {
  // Only allow identifier chars + * and ? — anything else and we bail out.
  if (!/^[\w*?]+$/.test(glob)) return null;
  const pattern = glob.replace(/\*/g, "\\w*").replace(/\?/g, "\\w");
  return new RegExp("^" + pattern + "$");
}

function formatRaw(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? math.format(value, { precision: 8 })
      : String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  // Unit: peel off symbol/code, return just the magnitude.
  try {
    const json = (value as { toJSON?: () => unknown }).toJSON?.();
    if (
      json &&
      typeof json === "object" &&
      (json as { mathjs?: string }).mathjs === "Unit"
    ) {
      const num = (json as { value?: number }).value;
      if (typeof num === "number") {
        return math.format(num, { precision: 8 });
      }
    }
  } catch {
    /* fall through */
  }
  return String(value);
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
