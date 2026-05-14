import type { TimerSpec } from "./parser";

export interface ActiveTimer {
  noteId: string;
  lineText: string;
  spec: TimerSpec;
  startedAt: number;
  nextFireAt: number;
  firedCount: number;
  pomodoroPhase: "work" | "break";
  pomodoroRound: number;
  done: boolean;
}

export function createTimer(
  noteId: string,
  lineText: string,
  spec: TimerSpec,
  now: number,
): ActiveTimer {
  const base = {
    noteId,
    lineText,
    spec,
    startedAt: now,
    firedCount: 0,
    pomodoroPhase: "work" as const,
    pomodoroRound: 1,
    done: false,
  };
  switch (spec.kind) {
    case "countdown":
      return { ...base, nextFireAt: now + spec.durationSec * 1000 };
    case "recurring":
      return { ...base, nextFireAt: now + spec.intervalSec * 1000 };
    case "at_time": {
      const d = new Date(now);
      d.setHours(spec.hour, spec.minute, 0, 0);
      let fire = d.getTime();
      // If the target time is already past for today, schedule tomorrow.
      if (fire <= now) fire += 86_400_000;
      return { ...base, nextFireAt: fire };
    }
    case "pomodoro":
      return { ...base, nextFireAt: now + spec.workMin * 60_000 };
  }
}

/** Advance the timer state right after it just fired. Mutates in place. */
export function advance(timer: ActiveTimer, now: number): void {
  timer.firedCount += 1;
  switch (timer.spec.kind) {
    case "countdown":
      timer.done = true;
      return;
    case "recurring":
      if (
        timer.spec.maxFires !== null &&
        timer.firedCount >= timer.spec.maxFires
      ) {
        timer.done = true;
      } else {
        timer.nextFireAt = now + timer.spec.intervalSec * 1000;
      }
      return;
    case "at_time":
      timer.done = true;
      return;
    case "pomodoro":
      if (timer.pomodoroPhase === "work") {
        timer.pomodoroPhase = "break";
        timer.nextFireAt = now + timer.spec.breakMin * 60_000;
      } else if (timer.pomodoroRound >= timer.spec.rounds) {
        timer.done = true;
      } else {
        timer.pomodoroRound += 1;
        timer.pomodoroPhase = "work";
        timer.nextFireAt = now + timer.spec.workMin * 60_000;
      }
      return;
  }
}

export interface DisplayInfo {
  text: string;
  done: boolean;
}

export function formatTimerDisplay(
  timer: ActiveTimer,
  now: number,
): DisplayInfo {
  const label = timer.spec.label ? ` · ${timer.spec.label}` : "";
  if (timer.done) {
    switch (timer.spec.kind) {
      case "countdown":
        return { text: ` ⏱ done${label}`, done: true };
      case "recurring":
        return { text: ` ↻ done${label}`, done: true };
      case "at_time":
        return { text: ` 🕒 fired${label}`, done: true };
      case "pomodoro":
        return { text: ` 🍅 complete${label}`, done: true };
    }
  }
  const remaining = formatRemaining(Math.max(0, timer.nextFireAt - now));
  switch (timer.spec.kind) {
    case "countdown":
      return { text: ` ⏱ ${remaining}${label}`, done: false };
    case "recurring": {
      const max = timer.spec.maxFires;
      const counter = max !== null ? ` · ${timer.firedCount}/${max}` : "";
      return { text: ` ↻ ${remaining}${counter}${label}`, done: false };
    }
    case "at_time": {
      const at = `${timer.spec.hour}:${String(timer.spec.minute).padStart(2, "0")}`;
      return { text: ` 🕒 ${at} (in ${remaining})${label}`, done: false };
    }
    case "pomodoro": {
      const round = `${timer.pomodoroRound}/${timer.spec.rounds}`;
      return {
        text: ` 🍅 ${timer.pomodoroPhase} ${remaining} · ${round}${label}`,
        done: false,
      };
    }
  }
}

function formatRemaining(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
