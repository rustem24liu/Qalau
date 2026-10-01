import { SIZE_WEIGHT } from "./constants";
import { today } from "./date";
import { weightOf } from "./progress";
import type { AppState, Goal } from "./types";

const DAY = 24 * 3600_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;


/** "YYYY-MM-DD" as local midnight. */
export const parseDay = (d: string) => {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd);
};

const dayStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A real calendar day in YYYY-MM-DD (so "2026-13-40" is rejected). */
export const isDay = (d: unknown): d is string => typeof d === "string" && DAY_RE.test(d) && dayStr(parseDay(d)) === d;

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY);

export const addDays = (d: string, n: number) => {
  const x = parseDay(d);
  x.setDate(x.getDate() + n);
  return dayStr(x);
};

export type DueState = "overdue" | "today" | "soon" | "later";

/** How close a deadline is: soon = within the next 2 days. */
export function dueState(due: string, now = today()): DueState {
  const left = daysBetween(now, due);
  return left < 0 ? "overdue" : left === 0 ? "today" : left <= 2 ? "soon" : "later";
}

const MONTH = new Intl.DateTimeFormat("ru", { day: "numeric", month: "short" });

/** «14 нояб.» */
export const fmtDay = (d: string) => MONTH.format(parseDay(d));

/** Short Russian label: «просрочено 2 дн.», «сегодня», «завтра», «через 5 дн.», «до 14 окт.». */
export function dueLabel(due: string, now = today()): string {
  const left = daysBetween(now, due);
  if (left < 0) return `просрочено ${-left} дн.`;
  if (left === 0) return "сегодня";
  if (left === 1) return "завтра";
  if (left <= 6) return `через ${left} дн.`;
  return "до " + MONTH.format(parseDay(due));
}

/** Sets or clears a deadline on a task or goal. Mutates. */
export function setDue(x: { due?: string }, due: string | null): void {
  if (due && isDay(due)) x.due = due;
  else delete x.due;
}

/** Sort rank inside a priority group: overdue first, then due today, then the rest. */
export const dueRank = (x: { due?: string; done?: boolean }, now = today()) => {
  if (!x.due || x.done) return 2;
  const st = dueState(x.due, now);
  return st === "overdue" ? 0 : st === "today" ? 1 : 2;
};

/** Days of history the forecast looks at; young goals still count at least PACE_MIN days, so one good day doesn't promise too much. */
export const PACE_WINDOW = 14;
export const PACE_MIN = 3;

export interface Forecast {
  /** Task weight finished per day lately (M = 2). */
  pace: number;
  /** Weight left to do. */
  left: number;
  /** Expected finish date, or null when there is no recent progress. */
  eta: string | null;
  /** Against the goal's deadline: null without one. */
  onTrack: boolean | null;
  /** Normal-size tasks per week needed to make the deadline (null without one or when it passed). */
  perWeek: number | null;
}

/** When the goal will be done at the recent pace, and whether that meets its deadline. */
export function forecast(s: AppState, g: Goal, now = Date.now()): Forecast {
  const total = g.tasks.reduce((n, t) => n + weightOf(t), 0);
  const left = g.tasks.reduce((n, t) => n + (t.done ? 0 : weightOf(t)), 0);
  const days = Math.min(PACE_WINDOW, Math.max(PACE_MIN, (now - (g.createdAt ?? now)) / DAY));
  const from = now - days * DAY;
  let finished = 0;
  for (const e of s.log) {
    if (e.t < from || !("goalId" in e) || e.goalId !== g.id || (e.kind !== "task_done" && e.kind !== "task_undone")) continue;
    const t = g.tasks.find(x => x.id === e.taskId);
    finished += (e.kind === "task_done" ? 1 : -1) * (t ? weightOf(t) : SIZE_WEIGHT.M);
  }
  const pace = Math.max(0, finished) / days;
  const d0 = today();
  const eta = left === 0 ? d0 : pace > 0 ? addDays(d0, Math.ceil(left / pace)) : null;
  let onTrack: boolean | null = null, perWeek: number | null = null;
  if (g.due && total) {
    onTrack = left === 0 || (eta !== null && daysBetween(eta, g.due) >= 0);
    const daysLeft = daysBetween(d0, g.due) + 1;
    perWeek = daysLeft > 0 ? Math.ceil(((left / SIZE_WEIGHT.M) * 7) / daysLeft) : null;
  }
  return { pace, left, eta, onTrack, perWeek };
}
