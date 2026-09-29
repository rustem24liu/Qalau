import type { GoalType, Priority } from "./types";

export const STAGES = ["Фундамент", "Стены", "Окна и дверь", "Крыша", "Труба", "Сад", "Новоселье"] as const;
export const FINAL_STAGE = STAGES.length - 1;

export interface KindInfo {
  name: string;
  house: string;
  note: string;
}

export const KINDS: Record<GoalType, KindInfo> = {
  big: { name: "Большая", house: "Дом", note: "на месяцы" },
  medium: { name: "Средняя", house: "Коттедж", note: "на недели" },
  daily: { name: "Ежедневная", house: "Хижина", note: "каждый день" },
};

/**
 * Max tasks in progress at once. Research on task switching says focus drops sharply
 * past 2–3 parallel tasks (Weinberg: ~20% lost per extra project; Leroy: attention residue).
 */
export const MAX_PARALLEL = 3;

/**
 * Work / break rhythm. Pomodoro is 25/5, DeskTime's top performers ~52/17, ultradian cycles ~90 min;
 * 50/10 keeps the prompt rare enough not to nag.
 */
export const TIRED_AFTER = 1 * 60000;
export const REST_FOR = 2 * 60000;
/** "Later" asks again after this much more work. */
export const SNOOZE_FOR = 2 * 60000;

export const GOAL_TYPES = Object.keys(KINDS) as GoalType[];

export const isGoalType = (t: unknown): t is GoalType => typeof t === "string" && t in KINDS;

/** Most urgent first; the index is the sort rank. */
export const PRIORITIES: Priority[] = ["high", "medium", "low"];

export const PRIORITY_LABEL: Record<Priority, string> = { high: "Высокий", medium: "Средний", low: "Низкий" };

export const isPriority = (p: unknown): p is Priority => typeof p === "string" && p in PRIORITY_LABEL;
