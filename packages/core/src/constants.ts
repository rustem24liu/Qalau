import type { GoalType } from "./types";

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

export const GOAL_TYPES = Object.keys(KINDS) as GoalType[];

export const isGoalType = (t: unknown): t is GoalType => typeof t === "string" && t in KINDS;
