import { REST_FOR, REST_MAX, REST_MIN, SNOOZE_FOR, TIRED_AFTER } from "./constants";
import { logEvent } from "./log";
import { earn, REWARD } from "./wallet";
import { runningTimers, togglePause } from "./timer";
import type { AppState, Rest, WorkLog } from "./types";

export const freshWork = (): WorkLog => ({ acc: 0, from: null, stoppedAt: null, promptAt: TIRED_AFTER });

export const workedMs = (w: WorkLog, now = Date.now()) => w.acc + (w.from != null ? now - w.from : 0);

export const restLeft = (r: Rest, now = Date.now()) => Math.max(0, r.start + r.dur - now);

/** Runs the work clock while any task runs outside a break. Mutates; call after every change. */
export function syncWork(s: AppState, now = Date.now()): void {
  const w = s.work;
  const busy = !s.rest && runningTimers(s.timers).length > 0;
  if (busy && w.from == null) {
    // a self-taken break as long as a proper rest resets fatigue
    if (w.stoppedAt != null && now - w.stoppedAt >= REST_FOR) Object.assign(w, freshWork());
    w.from = now;
  } else if (!busy && w.from != null) {
    w.acc += now - w.from;
    w.from = null;
    w.stoppedAt = now;
  }
}

/** The builder has worked long enough without a break to ask for one. */
export const isTired = (s: AppState, now = Date.now()) =>
  !s.rest && s.work.from != null && workedMs(s.work, now) >= s.work.promptAt;

const clampRest = (ms: number) => Math.min(REST_MAX, Math.max(REST_MIN, Math.round(ms) || REST_FOR));

/** Pauses every running task and starts a break of `dur` ms (clamped). No-op while already resting. Mutates. */
export function startRest(s: AppState, now = Date.now(), dur = REST_FOR): void {
  if (s.rest) return; // a second start would forget which tasks to resume
  const running = runningTimers(s.timers);
  running.forEach(tm => togglePause(tm, now));
  s.rest = { start: now, dur: clampRest(dur), resume: running.map(tm => tm.taskId) };
  syncWork(s, now);
}

/** Makes the current break longer (up to REST_MAX in total). Mutates. */
export function extendRest(s: AppState, ms: number): void {
  if (s.rest) s.rest.dur = Math.min(REST_MAX, s.rest.dur + ms);
}

/** Ends the break: fatigue resets and the paused tasks resume. Mutates. */
export function endRest(s: AppState, now = Date.now()): void {
  const r = s.rest;
  if (!r) return;
  s.rest = null;
  const took = Math.max(0, now - r.start);
  logEvent(s, { kind: "rest", ms: took }, now);
  if (took >= REWARD.restMin) earn(s, REWARD.rest, "rest", now);
  s.work = freshWork();
  s.timers.forEach(tm => { if (r.resume.includes(tm.taskId) && tm.paused != null) togglePause(tm, now); });
  syncWork(s, now);
}

/** Any return to work ends the break first — the builder can't sleep and hammer at once. Mutates. */
export function wake(s: AppState, now = Date.now()): void {
  if (s.rest) endRest(s, now);
}

/** Resumes a paused task, waking the builder if he's on a break. Mutates. */
export function resumeTask(s: AppState, taskId: string, now = Date.now()): void {
  wake(s, now);
  const tm = s.timers.find(x => x.taskId === taskId);
  if (tm && tm.paused != null) togglePause(tm, now); // endRest may already have resumed it
  syncWork(s, now);
}

/** "Later": ask again after SNOOZE_FOR more work. Mutates. */
export function snoozeRest(s: AppState, now = Date.now()): void {
  s.work.promptAt = workedMs(s.work, now) + SNOOZE_FOR;
}
