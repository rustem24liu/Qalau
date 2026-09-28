import { isGoalType } from "./constants";
import { today, yesterday } from "./date";
import type { AppState, Goal, GoalType, Task } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newGoal(type: GoalType, title: string): Goal {
  const g: Goal = { id: uid(), type, title, tasks: [] };
  if (type === "daily") Object.assign(g, { day: today(), built: 0, streak: 0 });
  return g;
}

export const newTask = (text: string): Task => ({ id: uid(), text, done: false });

export function exampleState(): AppState {
  const t = (text: string, done: boolean): Task => ({ id: uid(), text, done });
  const a = uid();
  return {
    example: true,
    activeId: a,
    goals: [
      {
        id: a, type: "big", title: "Запустить свой пет-проект", tasks: [
          t("Придумать идею и название", true), t("Спроектировать базу данных", true), t("Настроить Docker и репозиторий", true),
          t("Написать API авторизации", false), t("Сделать главную страницу", false), t("Задеплоить на сервер", false), t("Показать первым пользователям", false),
        ],
      },
      {
        id: uid(), type: "medium", title: "Прочитать книгу по Go", tasks: [
          t("Главы 1–3", true), t("Главы 4–6", true), t("Главы 7–9", true), t("Главы 10–12", false), t("Решить упражнения", false),
        ],
      },
      {
        id: uid(), type: "daily", title: "Хорошее утро", day: today(), built: 0, streak: 0, tasks: [
          t("Зарядка 10 минут", true), t("Стакан воды", true), t("30 минут чтения", false), t("План на день", false),
        ],
      },
    ],
  };
}

/** Repairs data loaded from storage. Mutates. */
export function normalize(state: AppState): void {
  state.goals.forEach(g => {
    if (!isGoalType(g.type)) g.type = "big";
    if (!Array.isArray(g.tasks)) g.tasks = [];
  });
  if (!state.goals.length) {
    const g = newGoal("big", "Новая цель");
    state.goals.push(g);
    state.activeId = g.id;
  }
}

export const activeGoal = (state: AppState): Goal =>
  state.goals.find(g => g.id === state.activeId) ?? state.goals[0];

/** Resets daily goals when the day changes. Mutates; returns true if anything changed. */
export function rollDaily(state: AppState): boolean {
  let changed = false;
  const t = today();
  state.goals.forEach(g => {
    if (g.type !== "daily") return;
    if (!g.day) {
      g.day = t;
      changed = true;
    } else if (g.day !== t) {
      if (g.lastBuilt !== yesterday() && g.lastBuilt !== t) g.streak = 0;
      g.tasks.forEach(x => { x.done = false; });
      g.day = t;
      changed = true;
    }
  });
  return changed;
}

/** Checks/unchecks a task, stops its timer and counts daily streaks. Mutates. */
export function markDone(state: AppState, g: Goal, t: Task, val: boolean): void {
  t.done = val;
  if (state.timer && state.timer.taskId === t.id) state.timer = null;
  if (g.type === "daily" && g.tasks.length && g.tasks.every(x => x.done) && g.lastBuilt !== today()) {
    g.streak = g.lastBuilt === yesterday() ? (g.streak || 0) + 1 : 1;
    g.built = (g.built || 0) + 1;
    g.lastBuilt = today();
  }
}
