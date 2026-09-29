import { lastActivity, logEvent } from "./log";
import type { AppState, Goal } from "./types";

const DAY = 24 * 3600_000;

/** Days without progress before a house gets overgrown, then marked abandoned. */
export const OVERGROWN_AFTER = 14 * DAY;
export const ABANDONED_AFTER = 30 * DAY;

/** 0 — fine, 1 — overgrown, 2 — abandoned. */
export type Neglect = 0 | 1 | 2;

export const NEGLECT_LABEL: Record<Neglect, string> = { 0: "", 1: "Заросло", 2: "Заброшено" };

/** Whole days since anything happened to the goal. */
export const idleDays = (s: AppState, g: Goal, now = Date.now()) => Math.floor((now - lastActivity(s, g)) / DAY);

/** How neglected a goal is. A finished building is never neglected. */
export function neglectOf(s: AppState, g: Goal, now = Date.now()): Neglect {
  if (g.tasks.length && g.tasks.every(t => t.done)) return 0;
  const idle = now - lastActivity(s, g);
  return idle >= ABANDONED_AFTER ? 2 : idle >= OVERGROWN_AFTER ? 1 : 0;
}

/** "I'll come back to it": counts as activity, so the weeds go away. Mutates. */
export function touchGoal(s: AppState, goalId: string, now = Date.now()): void {
  logEvent(s, { kind: "goal_touched", goalId }, now);
}
