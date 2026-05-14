import { describe, expect, it } from "vitest";
import { findInlineSpans } from "./parse";

describe("findInlineSpans", () => {
  it("finds bold", () => {
    expect(findInlineSpans("a **bold** b")).toEqual([
      { start: 2, end: 10, kind: "bold", markerLen: 2 },
    ]);
  });

  it("finds italic with stars", () => {
    expect(findInlineSpans("a *it* b")).toEqual([
      { start: 2, end: 6, kind: "italic", markerLen: 1 },
    ]);
  });

  it("finds italic with underscore", () => {
    expect(findInlineSpans("a _it_ b")).toEqual([
      { start: 2, end: 6, kind: "italic", markerLen: 1 },
    ]);
  });

  it("ignores underscore inside words", () => {
    expect(findInlineSpans("my_var_name")).toEqual([]);
  });

  it("finds inline code", () => {
    expect(findInlineSpans("a `code` b")).toEqual([
      { start: 2, end: 8, kind: "code", markerLen: 1 },
    ]);
  });

  it("finds multiple kinds in one line", () => {
    const r = findInlineSpans("**bold** and *it* and `c`");
    expect(r.map((s) => s.kind)).toEqual(["bold", "italic", "code"]);
  });

  it("bold wins over italic on overlap", () => {
    const r = findInlineSpans("**hello**");
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("bold");
  });

  it("code wins over everything", () => {
    const r = findInlineSpans("`**not bold**`");
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("code");
  });

  it("does not match unclosed markers", () => {
    expect(findInlineSpans("**unclosed")).toEqual([]);
    expect(findInlineSpans("`unclosed")).toEqual([]);
  });

  it("does not match empty content", () => {
    expect(findInlineSpans("****")).toEqual([]);
    expect(findInlineSpans("``")).toEqual([]);
  });

  it("returns spans sorted by start", () => {
    const r = findInlineSpans("*a* `b` **c**");
    expect(r.map((s) => s.start)).toEqual([0, 4, 8]);
  });
});
