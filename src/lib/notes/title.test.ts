import { describe, expect, it } from "vitest";
import { notePreview, noteTitle } from "./title";

describe("noteTitle", () => {
  it("returns Untitled for empty content", () => {
    expect(noteTitle("")).toBe("Untitled");
    expect(noteTitle("   \n  \n")).toBe("Untitled");
  });

  it("returns first non-empty line", () => {
    expect(noteTitle("hello world")).toBe("hello world");
    expect(noteTitle("\n\nhello\nworld")).toBe("hello");
  });

  it("strips heading markers", () => {
    expect(noteTitle("# My title")).toBe("My title");
    expect(noteTitle("### Sub")).toBe("Sub");
  });

  it("strips task markers", () => {
    expect(noteTitle("[ ] buy milk")).toBe("buy milk");
    expect(noteTitle("[x] done")).toBe("done");
  });
});

describe("notePreview", () => {
  it("returns empty for single-line notes", () => {
    expect(notePreview("hello")).toBe("");
    expect(notePreview("")).toBe("");
  });

  it("returns second non-empty line", () => {
    expect(notePreview("hello\nworld")).toBe("world");
    expect(notePreview("first\n\n\nsecond")).toBe("second");
  });

  it("strips markers", () => {
    expect(notePreview("# title\n[ ] task")).toBe("task");
  });
});
