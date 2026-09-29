import { SIZE_WEIGHT, sizeOf } from "./constants";
import { timerProgress } from "./timer";
import type { Goal, Task, Timer } from "./types";

export const weightOf = (t: Task) => SIZE_WEIGHT[sizeOf(t)];

/** Pieces for `done` of `total` weight; the last piece only when everything is done. */
const countFor = (done: number, total: number, N: number) =>
  done >= total ? N : Math.min(N - 1, Math.floor((done / total) * N));

const weights = (g: Goal) => {
  let total = 0, done = 0;
  for (const t of g.tasks) { const w = weightOf(t); total += w; if (t.done) done += w; }
  return { total, done };
};

/** How many of the building's N pieces are earned by finished tasks, by their size. */
export function builtCount(g: Goal, N: number): number {
  const { total, done } = weights(g);
  return total ? countFor(done, total, N) : 0;
}

/** Pieces a task of this size adds to the goal's building (roughly). */
export function piecesPerTask(g: Goal, N: number, t: Task): number {
  const { total } = weights(g);
  return total ? Math.round((weightOf(t) / total) * N) : 0;
}

/** builtCount plus the bricks running timers have placed so far — each timer adds a share of its task. */
export function liveCount(g: Goal, N: number, timers: Timer[], now = Date.now()): number {
  const { total, done } = weights(g);
  if (!total) return 0;
  let partial = 0;
  for (const tm of timers) {
    if (tm.goalId !== g.id) continue;
    const t = g.tasks.find(x => x.id === tm.taskId);
    if (t && !t.done) partial += timerProgress(tm, now) * weightOf(t);
  }
  // the building is only finished by ticking tasks off, never by timers alone
  return partial ? Math.max(builtCount(g, N), Math.min(N - 1, countFor(done + partial, total, N))) : builtCount(g, N);
}
