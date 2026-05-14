import { describe, expect, it } from "vitest";
import { parseHeadingLine } from "./parse";

describe("parseHeadingLine", () => {
  it("matches H1 through H6", () => {
    expect(parseHeadingLine("# one")?.level).toBe(1);
    expect(parseHeadingLine("## two")?.level).toBe(2);
    expect(parseHeadingLine("### three")?.level).toBe(3);
    expect(parseHeadingLine("#### four")?.level).toBe(4);
    expect(parseHeadingLine("##### five")?.level).toBe(5);
    expect(parseHeadingLine("###### six")?.level).toBe(6);
  });

  it("does not match 7+ hashes", () => {
    expect(parseHeadingLine("####### seven")).toBeNull();
  });

  it("requires trailing whitespace", () => {
    expect(parseHeadingLine("#hello")).toBeNull();
    expect(parseHeadingLine("##hello")).toBeNull();
  });

  it("matches indented headings", () => {
    expect(parseHeadingLine("  ## indented")).toEqual({
      level: 2,
      markerStart: 2,
      markerEnd: 4,
    });
  });

  it("matches a bare marker with trailing space", () => {
    expect(parseHeadingLine("# ")?.level).toBe(1);
  });

  it("rejects non-headings", () => {
    expect(parseHeadingLine("hello")).toBeNull();
    expect(parseHeadingLine("")).toBeNull();
    expect(parseHeadingLine("#")).toBeNull();
  });

  it("reports correct marker offsets", () => {
    expect(parseHeadingLine("### foo")).toEqual({
      level: 3,
      markerStart: 0,
      markerEnd: 3,
    });
  });
});
