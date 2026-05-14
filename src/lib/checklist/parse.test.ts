import { describe, expect, it } from "vitest";
import { countTasks, parseTaskLine } from "./parse";

describe("parseTaskLine", () => {
  it("matches unchecked", () => {
    expect(parseTaskLine("[ ] foo")).toEqual({
      indent: "",
      done: false,
      markerStart: 0,
      markerEnd: 3,
    });
  });

  it("matches checked (lowercase x)", () => {
    expect(parseTaskLine("[x] done")).toEqual({
      indent: "",
      done: true,
      markerStart: 0,
      markerEnd: 3,
    });
  });

  it("matches checked (uppercase X)", () => {
    expect(parseTaskLine("[X] done")?.done).toBe(true);
  });

  it("matches indented tasks", () => {
    expect(parseTaskLine("    [ ] nested")).toEqual({
      indent: "    ",
      done: false,
      markerStart: 4,
      markerEnd: 7,
    });
  });

  it("matches a bare marker (no content)", () => {
    expect(parseTaskLine("[ ]")).not.toBeNull();
    expect(parseTaskLine("  [x]")).not.toBeNull();
  });

  it("rejects mid-line markers", () => {
    expect(parseTaskLine("hello [ ] world")).toBeNull();
  });

  it("rejects markers without trailing space", () => {
    expect(parseTaskLine("[ ]foo")).toBeNull();
  });

  it("rejects invalid marker contents", () => {
    expect(parseTaskLine("[a] foo")).toBeNull();
    expect(parseTaskLine("[] foo")).toBeNull();
    expect(parseTaskLine("[ y] foo")).toBeNull();
  });

  it("rejects plain text", () => {
    expect(parseTaskLine("buy milk")).toBeNull();
    expect(parseTaskLine("")).toBeNull();
  });
});

describe("countTasks", () => {
  it("counts done and total separately", () => {
    const doc = "[ ] a\n[x] b\n[X] c\nnot a task\n[ ] d";
    expect(countTasks(doc)).toEqual({ done: 2, total: 4 });
  });

  it("returns zeros for a doc with no tasks", () => {
    expect(countTasks("hello\nworld")).toEqual({ done: 0, total: 0 });
    expect(countTasks("")).toEqual({ done: 0, total: 0 });
  });

  it("counts indented tasks", () => {
    expect(countTasks("[ ] top\n  [x] sub\n  [ ] sub2")).toEqual({
      done: 1,
      total: 3,
    });
  });
});
