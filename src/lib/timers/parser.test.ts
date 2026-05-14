import { describe, expect, it } from "vitest";
import { formatDuration, parseDuration, parseTimerLine } from "./parser";

describe("parseDuration", () => {
  it("parses single units", () => {
    expect(parseDuration("30s")).toBe(30);
    expect(parseDuration("5m")).toBe(300);
    expect(parseDuration("1h")).toBe(3600);
  });

  it("parses compound durations", () => {
    expect(parseDuration("1h30m")).toBe(5400);
    expect(parseDuration("2h15m30s")).toBe(8130);
  });

  it("rejects invalid input", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("5x")).toBeNull();
    expect(parseDuration("5m abc")).toBeNull();
  });
});

describe("parseTimerLine — countdown", () => {
  it("parses `timer Xm: label`", () => {
    expect(parseTimerLine("timer 5m: laundry")).toEqual({
      kind: "countdown",
      durationSec: 300,
      label: "laundry",
    });
  });

  it("parses without label", () => {
    expect(parseTimerLine("timer 30s")).toEqual({
      kind: "countdown",
      durationSec: 30,
      label: "",
    });
  });

  it("parses compound duration", () => {
    expect(parseTimerLine("timer 1h30m: meeting")).toEqual({
      kind: "countdown",
      durationSec: 5400,
      label: "meeting",
    });
  });

  it("rejects bad duration", () => {
    expect(parseTimerLine("timer abc: foo")).toBeNull();
    expect(parseTimerLine("timer 0m: foo")).toBeNull();
  });
});

describe("parseTimerLine — recurring", () => {
  it("parses `every Xm: label`", () => {
    expect(parseTimerLine("every 25m: stretch")).toEqual({
      kind: "recurring",
      intervalSec: 1500,
      maxFires: null,
      label: "stretch",
    });
  });

  it("parses with max fires `every Xh x N: label`", () => {
    expect(parseTimerLine("every 1h x 8: water")).toEqual({
      kind: "recurring",
      intervalSec: 3600,
      maxFires: 8,
      label: "water",
    });
  });

  it("rejects zero or negative max", () => {
    expect(parseTimerLine("every 1h x 0: water")).toBeNull();
  });
});

describe("parseTimerLine — at_time", () => {
  it("parses `at HH:MM: label`", () => {
    expect(parseTimerLine("at 14:30: meeting")).toEqual({
      kind: "at_time",
      hour: 14,
      minute: 30,
      label: "meeting",
    });
  });

  it("parses without label", () => {
    expect(parseTimerLine("at 9:00")).toEqual({
      kind: "at_time",
      hour: 9,
      minute: 0,
      label: "",
    });
  });

  it("rejects out-of-range time", () => {
    expect(parseTimerLine("at 25:00: x")).toBeNull();
    expect(parseTimerLine("at 12:60: x")).toBeNull();
  });

  it("does not match free text containing `at HH:MM`", () => {
    expect(parseTimerLine("let's meet at 14:30")).toBeNull();
  });
});

describe("parseTimerLine — pomodoro", () => {
  it("parses `pomodoro X/Y x N: label`", () => {
    expect(parseTimerLine("pomodoro 25/5 x 4: focus")).toEqual({
      kind: "pomodoro",
      workMin: 25,
      breakMin: 5,
      rounds: 4,
      label: "focus",
    });
  });

  it("defaults rounds to 4 when omitted", () => {
    expect(parseTimerLine("pomodoro 25/5: focus")).toEqual({
      kind: "pomodoro",
      workMin: 25,
      breakMin: 5,
      rounds: 4,
      label: "focus",
    });
  });
});

describe("parseTimerLine — rejects non-timer lines", () => {
  it("returns null for plain text", () => {
    expect(parseTimerLine("buy milk")).toBeNull();
    expect(parseTimerLine("")).toBeNull();
    expect(parseTimerLine("# heading")).toBeNull();
    expect(parseTimerLine("[ ] task")).toBeNull();
  });

  it("returns null for math lines", () => {
    expect(parseTimerLine("rent = 1200")).toBeNull();
    expect(parseTimerLine("2 + 2 =")).toBeNull();
  });
});

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(30)).toBe("30s");
  });
  it("formats minutes only", () => {
    expect(formatDuration(300)).toBe("5min");
  });
  it("formats hours only", () => {
    expect(formatDuration(3600)).toBe("1h");
  });
  it("formats compound", () => {
    expect(formatDuration(5400)).toBe("1h30m");
    expect(formatDuration(8130)).toBe("2h15m30s");
  });
});
