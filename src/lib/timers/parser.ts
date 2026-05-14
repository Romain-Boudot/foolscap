export type TimerSpec =
  | { kind: "countdown"; durationSec: number; label: string }
  | {
      kind: "recurring";
      intervalSec: number;
      maxFires: number | null;
      label: string;
    }
  | { kind: "at_time"; hour: number; minute: number; label: string }
  | {
      kind: "pomodoro";
      workMin: number;
      breakMin: number;
      rounds: number;
      label: string;
    };

const TIMER_RE = /^\s*timer\s+(\S+)(?:\s*:\s*(.*))?$/;
const EVERY_RE = /^\s*every\s+(\S+?)(?:\s+x\s*(\d+))?(?:\s*:\s*(.*))?$/;
const AT_RE = /^\s*at\s+(\d{1,2}):(\d{2})(?:\s*:\s*(.*))?$/;
const POMODORO_RE =
  /^\s*pomodoro\s+(\d+)\/(\d+)(?:\s+x\s*(\d+))?(?:\s*:\s*(.*))?$/;

export function parseTimerLine(line: string): TimerSpec | null {
  let m: RegExpExecArray | null;

  if ((m = TIMER_RE.exec(line))) {
    const dur = parseDuration(m[1]);
    if (dur === null || dur <= 0) return null;
    return {
      kind: "countdown",
      durationSec: dur,
      label: (m[2] ?? "").trim(),
    };
  }

  if ((m = EVERY_RE.exec(line))) {
    const dur = parseDuration(m[1]);
    if (dur === null || dur <= 0) return null;
    const max = m[2] ? parseInt(m[2], 10) : null;
    if (max !== null && max <= 0) return null;
    return {
      kind: "recurring",
      intervalSec: dur,
      maxFires: max,
      label: (m[3] ?? "").trim(),
    };
  }

  if ((m = AT_RE.exec(line))) {
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
    return { kind: "at_time", hour: h, minute: mi, label: (m[3] ?? "").trim() };
  }

  if ((m = POMODORO_RE.exec(line))) {
    const work = parseInt(m[1], 10);
    const brk = parseInt(m[2], 10);
    const rounds = m[3] ? parseInt(m[3], 10) : 4;
    if (work <= 0 || brk <= 0 || rounds <= 0) return null;
    return {
      kind: "pomodoro",
      workMin: work,
      breakMin: brk,
      rounds,
      label: (m[4] ?? "").trim(),
    };
  }

  return null;
}

/** Parse a compact duration like `5m`, `30s`, `1h30m`, `2h15m30s`.
 *  Returns total seconds, or null if not a valid duration. */
export function parseDuration(s: string): number | null {
  if (!s) return null;
  let pos = 0;
  let total = 0;
  let any = false;
  while (pos < s.length) {
    const m = /^(\d+)([smh])/.exec(s.slice(pos));
    if (!m) return null;
    any = true;
    const n = parseInt(m[1], 10);
    if (m[2] === "s") total += n;
    else if (m[2] === "m") total += n * 60;
    else total += n * 3600;
    pos += m[0].length;
  }
  return any ? total : null;
}

/** Pretty-print a duration in seconds as `1h30m` / `25min` / `30s`. */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(h > 0 ? `${m}m` : `${m}min`);
  if (s > 0) parts.push(`${s}s`);
  return parts.join("");
}
