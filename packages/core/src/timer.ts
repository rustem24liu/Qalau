import type { Timer } from "./types";

/** Stopwatch: pieces slow down over ~15 min, capped at 90% of the task. */
export const SW_TAU = 15 * 60000;

export const elapsed = (tm: Timer, now = Date.now()) => (tm.paused != null ? tm.paused : now - tm.start);

/** 0..1 share of the current task's bricks already placed. */
export const timerProgress = (tm: Timer, now = Date.now()) =>
  tm.mode === "up" ? 0.9 * (1 - Math.exp(-elapsed(tm, now) / SW_TAU)) : Math.min(1, elapsed(tm, now) / tm.dur);

export const isExpired = (tm: Timer, now = Date.now()) =>
  tm.mode === "down" && tm.paused == null && now - tm.start >= tm.dur;

/** Pause or resume. Mutates. */
export function togglePause(tm: Timer, now = Date.now()): void {
  if (tm.paused != null) {
    tm.start = now - tm.paused;
    tm.paused = null;
  } else tm.paused = now - tm.start;
}
