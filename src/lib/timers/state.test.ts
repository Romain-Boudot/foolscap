import { describe, it, expect } from "vitest";
import { createTimer, advance, formatTimerDisplay } from "./state";
import type { TimerSpec } from "./parser";

const NOW = 1_700_000_000_000;

describe("createTimer", () => {
  it("schedules a countdown duration ahead", () => {
    const spec: TimerSpec = {
      kind: "countdown",
      durationSec: 300,
      label: "x",
    };
    const t = createTimer("n1", "timer 5m: x", spec, NOW);
    expect(t.nextFireAt).toBe(NOW + 300_000);
    expect(t.done).toBe(false);
    expect(t.firedCount).toBe(0);
  });

  it("schedules a recurring interval ahead", () => {
    const spec: TimerSpec = {
      kind: "recurring",
      intervalSec: 60,
      maxFires: 3,
      label: "",
    };
    const t = createTimer("n1", "every 1m x 3", spec, NOW);
    expect(t.nextFireAt).toBe(NOW + 60_000);
  });

  it("schedules at_time today when target is still ahead", () => {
    const base = new Date(NOW);
    base.setHours(8, 0, 0, 0);
    const start = base.getTime();
    const spec: TimerSpec = { kind: "at_time", hour: 14, minute: 30, label: "" };
    const t = createTimer("n1", "at 14:30", spec, start);
    const expected = new Date(start);
    expected.setHours(14, 30, 0, 0);
    expect(t.nextFireAt).toBe(expected.getTime());
  });

  it("schedules at_time tomorrow if target is already past", () => {
    const base = new Date(NOW);
    base.setHours(18, 0, 0, 0);
    const start = base.getTime();
    const spec: TimerSpec = { kind: "at_time", hour: 14, minute: 30, label: "" };
    const t = createTimer("n1", "at 14:30", spec, start);
    expect(t.nextFireAt).toBeGreaterThan(start);
    expect(t.nextFireAt - start).toBeGreaterThan(15 * 3600_000);
  });

  it("schedules pomodoro at the first work-block end", () => {
    const spec: TimerSpec = {
      kind: "pomodoro",
      workMin: 25,
      breakMin: 5,
      rounds: 4,
      label: "focus",
    };
    const t = createTimer("n1", "pomodoro 25/5 x 4: focus", spec, NOW);
    expect(t.nextFireAt).toBe(NOW + 25 * 60_000);
    expect(t.pomodoroPhase).toBe("work");
    expect(t.pomodoroRound).toBe(1);
  });
});

describe("advance", () => {
  it("marks countdown done after firing", () => {
    const spec: TimerSpec = { kind: "countdown", durationSec: 10, label: "" };
    const t = createTimer("n1", "timer 10s", spec, NOW);
    advance(t, NOW + 10_000);
    expect(t.done).toBe(true);
    expect(t.firedCount).toBe(1);
  });

  it("reschedules recurring under maxFires", () => {
    const spec: TimerSpec = {
      kind: "recurring",
      intervalSec: 60,
      maxFires: 3,
      label: "",
    };
    const t = createTimer("n1", "every 1m x 3", spec, NOW);
    advance(t, NOW + 60_000);
    expect(t.done).toBe(false);
    expect(t.firedCount).toBe(1);
    expect(t.nextFireAt).toBe(NOW + 120_000);
  });

  it("marks recurring done when maxFires reached", () => {
    const spec: TimerSpec = {
      kind: "recurring",
      intervalSec: 60,
      maxFires: 2,
      label: "",
    };
    const t = createTimer("n1", "every 1m x 2", spec, NOW);
    advance(t, NOW + 60_000);
    advance(t, NOW + 120_000);
    expect(t.firedCount).toBe(2);
    expect(t.done).toBe(true);
  });

  it("reschedules recurring forever when maxFires is null", () => {
    const spec: TimerSpec = {
      kind: "recurring",
      intervalSec: 60,
      maxFires: null,
      label: "",
    };
    const t = createTimer("n1", "every 1m", spec, NOW);
    for (let i = 0; i < 100; i++) advance(t, NOW + (i + 1) * 60_000);
    expect(t.done).toBe(false);
    expect(t.firedCount).toBe(100);
  });

  it("transitions pomodoro work → break → work → break … then done", () => {
    const spec: TimerSpec = {
      kind: "pomodoro",
      workMin: 25,
      breakMin: 5,
      rounds: 2,
      label: "",
    };
    const t = createTimer("n1", "pomodoro 25/5 x 2", spec, NOW);

    // End of work round 1 → break
    advance(t, NOW + 25 * 60_000);
    expect(t.pomodoroPhase).toBe("break");
    expect(t.pomodoroRound).toBe(1);
    expect(t.done).toBe(false);

    // End of break → work round 2
    advance(t, NOW + 30 * 60_000);
    expect(t.pomodoroPhase).toBe("work");
    expect(t.pomodoroRound).toBe(2);

    // End of work round 2 → break
    advance(t, NOW + 55 * 60_000);
    expect(t.pomodoroPhase).toBe("break");
    expect(t.pomodoroRound).toBe(2);

    // End of final break → complete
    advance(t, NOW + 60 * 60_000);
    expect(t.done).toBe(true);
  });

  it("marks at_time done after firing once", () => {
    const spec: TimerSpec = { kind: "at_time", hour: 14, minute: 30, label: "" };
    const t = createTimer("n1", "at 14:30", spec, NOW);
    advance(t, t.nextFireAt);
    expect(t.done).toBe(true);
  });
});

describe("formatTimerDisplay", () => {
  it("shows seconds for countdown under 1 minute", () => {
    const spec: TimerSpec = { kind: "countdown", durationSec: 30, label: "x" };
    const t = createTimer("n1", "timer 30s: x", spec, NOW);
    const d = formatTimerDisplay(t, NOW);
    expect(d.text).toContain("30s");
    expect(d.text).toContain("x");
  });

  it("shows M:SS for countdown between 1m and 1h", () => {
    const spec: TimerSpec = { kind: "countdown", durationSec: 300, label: "" };
    const t = createTimer("n1", "timer 5m", spec, NOW);
    const d = formatTimerDisplay(t, NOW);
    expect(d.text).toContain("5:00");
  });

  it("shows Hh MM m for countdown over 1 hour", () => {
    const spec: TimerSpec = { kind: "countdown", durationSec: 5400, label: "" };
    const t = createTimer("n1", "timer 1h30m", spec, NOW);
    const d = formatTimerDisplay(t, NOW);
    expect(d.text).toContain("1h30m");
  });

  it("shows progress counter for capped recurring", () => {
    const spec: TimerSpec = {
      kind: "recurring",
      intervalSec: 60,
      maxFires: 8,
      label: "water",
    };
    const t = createTimer("n1", "every 1m x 8: water", spec, NOW);
    advance(t, NOW + 60_000);
    advance(t, NOW + 120_000);
    const d = formatTimerDisplay(t, NOW + 120_000);
    expect(d.text).toContain("2/8");
    expect(d.text).toContain("water");
  });

  it("shows done for completed countdown", () => {
    const spec: TimerSpec = { kind: "countdown", durationSec: 5, label: "x" };
    const t = createTimer("n1", "timer 5s: x", spec, NOW);
    advance(t, NOW + 5000);
    const d = formatTimerDisplay(t, NOW + 5000);
    expect(d.done).toBe(true);
    expect(d.text).toContain("done");
  });

  it("shows phase + round for pomodoro", () => {
    const spec: TimerSpec = {
      kind: "pomodoro",
      workMin: 25,
      breakMin: 5,
      rounds: 4,
      label: "focus",
    };
    const t = createTimer("n1", "pomodoro 25/5 x 4: focus", spec, NOW);
    const d = formatTimerDisplay(t, NOW);
    expect(d.text).toContain("work");
    expect(d.text).toContain("1/4");
  });
});
