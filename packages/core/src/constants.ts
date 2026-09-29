import type { GoalType, Priority, TaskSize } from "./types";

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
export const TIRED_AFTER = 50 * 60000;
export const REST_FOR = 10 * 60000;
/** "Later" asks again after this much more work. */
export const SNOOZE_FOR = 10 * 60000;
/** Break lengths offered in the UI, minutes; a custom one is clamped to REST_MIN..REST_MAX. */
export const REST_PRESETS = [5, 10, 15, 30];
export const REST_MIN = 1 * 60000;
export const REST_MAX = 120 * 60000;

export const GOAL_TYPES = Object.keys(KINDS) as GoalType[];

export const isGoalType = (t: unknown): t is GoalType => typeof t === "string" && t in KINDS;

/** Most urgent first; the index is the sort rank. */
export const PRIORITIES: Priority[] = ["high", "medium", "low"];

export const PRIORITY_LABEL: Record<Priority, string> = { high: "Высокий", medium: "Средний", low: "Низкий" };

export const isPriority = (p: unknown): p is Priority => typeof p === "string" && p in PRIORITY_LABEL;

export const TASK_SIZES: TaskSize[] = ["S", "M", "L"];

export const SIZE_LABEL: Record<TaskSize, string> = { S: "Мелкая", M: "Обычная", L: "Крупная" };

/** Share of the building a task is worth: a large task builds three times a small one. */
export const SIZE_WEIGHT: Record<TaskSize, number> = { S: 1, M: 2, L: 3 };

export const isTaskSize = (s: unknown): s is TaskSize => typeof s === "string" && s in SIZE_WEIGHT;

export const sizeOf = (t: { size?: TaskSize }): TaskSize => t.size ?? "M";
