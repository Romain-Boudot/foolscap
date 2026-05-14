import { chimeMuted, chimeVolume } from "./chimeSettings";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Short two-note ascending chirp (E5 → A5). Pleasant but cuts through.
 *  Honors user volume + mute settings (see chimeSettings.ts). */
export function playChime() {
  if (chimeMuted.value) return;
  const vol = chimeVolume.value;
  if (vol <= 0) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  const peak = 0.22 * vol;
  const t0 = ctx.currentTime;
  const note = (freq: number, start: number, dur: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, t0 + start);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + start);
    osc.stop(t0 + start + dur + 0.05);
  };
  note(659.25, 0, 0.2);
  note(880, 0.14, 0.4);
}
