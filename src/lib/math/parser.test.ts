import { describe, expect, it } from "vitest";
import { parseLine } from "./parser";

describe("parseLine", () => {
  it("classifies blank lines", () => {
    expect(parseLine("")).toEqual({ kind: "blank" });
    expect(parseLine("   ")).toEqual({ kind: "blank" });
  });

  it("classifies comments", () => {
    expect(parseLine("# foo")).toEqual({ kind: "comment" });
    expect(parseLine("  # bar")).toEqual({ kind: "comment" });
  });

  it("classifies assignments", () => {
    expect(parseLine("rent = 1200")).toEqual({
      kind: "assignment",
      name: "rent",
      expr: "1200",
    });
    expect(parseLine("x = a + b")).toEqual({
      kind: "assignment",
      name: "x",
      expr: "a + b",
    });
    expect(parseLine("_pi = 3.14")).toEqual({
      kind: "assignment",
      name: "_pi",
      expr: "3.14",
    });
  });

  it("classifies queries (trailing =)", () => {
    expect(parseLine("2 + 2 =")).toEqual({ kind: "query", expr: "2 + 2" });
    expect(parseLine("salary - rent =")).toEqual({
      kind: "query",
      expr: "salary - rent",
    });
    expect(parseLine("5 km to mi =")).toEqual({
      kind: "query",
      expr: "5 km to mi",
    });
  });

  it("treats lone = as blank", () => {
    expect(parseLine("=")).toEqual({ kind: "blank" });
    expect(parseLine("   =   ")).toEqual({ kind: "blank" });
  });

  it("trailing = wins over assignment shape", () => {
    expect(parseLine("total = salary - rent =")).toEqual({
      kind: "query",
      expr: "total = salary - rent",
    });
  });

  it("classifies plain text", () => {
    expect(parseLine("buy milk")).toEqual({ kind: "text" });
    expect(parseLine("[ ] todo item")).toEqual({ kind: "text" });
    expect(parseLine("5 = 5")).toEqual({ kind: "text" });
  });
});
