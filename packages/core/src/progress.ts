import { timerProgress } from "./timer";
import type { Goal, Timer } from "./types";

const countFor = (done: number, total: number, N: number) =>
  done >= total ? N : Math.min(N - 1, Math.floor((done / total) * N));

/** How many of the building's N pieces are earned by finished tasks. */
export function builtCount(g: Goal, N: number): number {
  const total = g.tasks.length;
  if (!total) return 0;
  return countFor(g.tasks.filter(t => t.done).length, total, N);
}

/** builtCount plus the bricks a running timer has placed so far. */
export function liveCount(g: Goal, N: number, tm: Timer | null | undefined, now = Date.now()): number {
  const base = builtCount(g, N);
  if (!tm || tm.goalId !== g.id) return base;
  const t = g.tasks.find(x => x.id === tm.taskId);
  if (!t || t.done) return base;
  const done = g.tasks.filter(x => x.done).length;
  const after = countFor(done + 1, g.tasks.length, N);
  return base + Math.floor(timerProgress(tm, now) * (after - base));
}
