import type { AppState, Goal } from "./types";

/**
 * What happened, and when. The journal feeds weekly reports, abandoned-goal
 * detection and rewards, and later syncs to a server as-is.
 */
export type LogEvent =
  | { t: number; kind: "task_done" | "task_undone" | "task_added"; goalId: string; taskId: string }
  | { t: number; kind: "goal_created" | "hut_built" | "goal_touched" | "freeze_used"; goalId: string }
  /** Coins earned (amount > 0) or spent (< 0). */
  | { t: number; kind: "coins"; amount: number; reason: string }
  /** A finished timer session: `ms` of focused work on a task. */
  | { t: number; kind: "focus"; goalId: string; taskId: string; ms: number }
  /** A break that was actually taken. */
  | { t: number; kind: "rest"; ms: number };

type NewEvent = LogEvent extends infer E ? (E extends LogEvent ? Omit<E, "t"> : never) : never;

/** Keep about half a year, and never more than LOG_MAX events, so localStorage stays small. */
export const LOG_KEEP = 183 * 24 * 3600_000;
export const LOG_MAX = 5000;

export function logEvent(s: AppState, e: NewEvent, now = Date.now()): void {
  s.log.push({ ...e, t: now } as LogEvent);
}

/** Drops events past the retention window or the size cap. Mutates. */
export function pruneLog(s: AppState, now = Date.now()): void {
  const from = now - LOG_KEEP;
  let log = s.log.filter(e => e && typeof e.t === "number" && e.t >= from);
  if (log.length > LOG_MAX) log = log.slice(-LOG_MAX);
  s.log = log;
}

/** Last time anything happened to the goal (or when it was created). */
export function lastActivity(s: AppState, g: Goal): number {
  let t = g.createdAt ?? 0;
  for (const e of s.log) if ("goalId" in e && e.goalId === g.id && e.t > t) t = e.t;
  return t;
}
