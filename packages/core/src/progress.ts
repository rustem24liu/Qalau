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

/** builtCount plus the bricks running timers have placed so far — each timer adds a share of one task. */
export function liveCount(g: Goal, N: number, timers: Timer[], now = Date.now()): number {
  const total = g.tasks.length;
  if (!total) return 0;
  const done = g.tasks.filter(t => t.done).length;
  let partial = 0;
  for (const tm of timers) {
    if (tm.goalId !== g.id) continue;
    const t = g.tasks.find(x => x.id === tm.taskId);
    if (t && !t.done) partial += timerProgress(tm, now);
  }
  // the building is only finished by ticking tasks off, never by timers alone
  return partial ? Math.max(builtCount(g, N), Math.min(N - 1, countFor(done + partial, total, N))) : builtCount(g, N);
}
