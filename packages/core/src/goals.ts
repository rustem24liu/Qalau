import { isLandmark, landmarkFor } from "./city";
import { isGoalType, isPriority, isTaskSize, PRIORITIES } from "./constants";
import { logEvent, pruneLog } from "./log";
import { freshWork } from "./rest";
import { daysAgo, today, yesterday } from "./date";
import { earn, freshWallet, normalizeWallet, REWARD, rewardTask } from "./wallet";
import type { AppState, Goal, GoalType, Priority, Task, TaskSize } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newGoal(type: GoalType, title: string): Goal {
  const g: Goal = { id: uid(), type, title, tasks: [], createdAt: Date.now() };
  if (type === "daily") Object.assign(g, { day: today(), built: 0, streak: 0 });
  return g;
}

export const newTask = (text: string): Task => ({ id: uid(), text, done: false });

export function exampleState(): AppState {
  const t = (text: string, done: boolean): Task => ({ id: uid(), text, done });
  const a = uid();
  const state: AppState = {
    example: true,
    activeId: a,
    timers: [],
    work: freshWork(),
    log: [],
    wallet: freshWallet(),
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
  state.goals.forEach(g => { sortByPriority(g); g.createdAt = Date.now(); }); // finished example tasks sit at the bottom, like real ones
  return state;
}

/**
 * Repairs data loaded from storage and keeps the task order invariant (see sortByPriority).
 * Runs after every change, so checking a task off or setting a priority re-orders the list. Mutates.
 */
export function normalize(state: AppState): void {
  if (!Array.isArray(state.timers)) state.timers = state.timer ? [state.timer] : [];
  delete state.timer;
  if (!state.work) state.work = freshWork();
  if (!Array.isArray(state.log)) state.log = [];
  pruneLog(state);
  normalizeWallet(state);
  if (state.city && (typeof state.city.name !== "string" || !state.city.name.trim())) state.city = null;
  else if (state.city && !isLandmark(state.city.landmark)) state.city.landmark = landmarkFor(state.city.name);
  state.goals.forEach(g => {
    if (!isGoalType(g.type)) g.type = "big";
    if (!Array.isArray(g.tasks)) g.tasks = [];
    if (typeof g.createdAt !== "number") g.createdAt = Date.now();
    g.tasks.forEach(t => {
      if (t.priority !== undefined && !isPriority(t.priority)) delete t.priority;
      if (t.size !== undefined && (!isTaskSize(t.size) || t.size === "M")) delete t.size; // M is the default
    });
    sortByPriority(g);
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
      if (g.lastBuilt !== yesterday() && g.lastBuilt !== t) {
        // one missed day can be covered by a streak freeze
        if (g.lastBuilt === daysAgo(2) && (g.streak || 0) > 0 && state.wallet?.freezes > 0) {
          state.wallet.freezes--;
          g.lastBuilt = yesterday();
          logEvent(state, { kind: "freeze_used", goalId: g.id });
        } else g.streak = 0;
      }
      g.tasks.forEach(x => { x.done = false; delete x.rewarded; }); // a new day pays again
      sortByPriority(g); // yesterday's finished tasks come back into their priority groups
      g.day = t;
      changed = true;
    }
  });
  return changed;
}

/** Moves a task to position `to` in its goal (order = priority). Mutates; ignores unknown ids. */
export function moveTask(g: Goal, taskId: string, to: number): void {
  const from = g.tasks.findIndex(t => t.id === taskId);
  if (from < 0) return;
  const [t] = g.tasks.splice(from, 1);
  g.tasks.splice(Math.max(0, Math.min(to, g.tasks.length)), 0, t);
}

/** Sets a task's size; "M" is stored as no size. Mutates. */
export function setSize(t: Task, size: TaskSize): void {
  if (size === "M") delete t.size;
  else t.size = size;
}

/** Sets or clears (null) a task's priority. Mutates. */
export function setPriority(t: Task, p: Priority | null): void {
  if (p) t.priority = p;
  else delete t.priority;
}

const rank = (t: Task) => (t.done ? PRIORITIES.length + 1 : t.priority ? PRIORITIES.indexOf(t.priority) : PRIORITIES.length);

/**
 * The list invariant: open tasks by priority (high → none), finished ones last.
 * Stable, so tasks within a group keep their manual (drag) order. Mutates.
 */
export function sortByPriority(g: Goal): void {
  g.tasks = g.tasks.map((t, i) => [t, i] as const).sort(([a, i], [b, j]) => rank(a) - rank(b) || i - j).map(([t]) => t);
}

/** Checks/unchecks a task, stops its timer and counts daily streaks. Mutates. */
export function markDone(state: AppState, g: Goal, t: Task, val: boolean, now = Date.now()): void {
  // a just-finished task goes to the very bottom (sorting is stable, so it stays last among done ones)
  if (val && !t.done && g.tasks.includes(t)) g.tasks = [...g.tasks.filter(x => x !== t), t];
  if (t.done !== val) logEvent(state, { kind: val ? "task_done" : "task_undone", goalId: g.id, taskId: t.id }, now);
  t.done = val;
  if (val) rewardTask(state, t, now);
  state.timers = state.timers.filter(tm => tm.taskId !== t.id);
  if (g.type === "daily" && g.tasks.length && g.tasks.every(x => x.done) && g.lastBuilt !== today()) {
    g.streak = g.lastBuilt === yesterday() ? (g.streak || 0) + 1 : 1;
    g.built = (g.built || 0) + 1;
    g.lastBuilt = today();
    logEvent(state, { kind: "hut_built", goalId: g.id }, now);
    earn(state, REWARD.hut, "hut", now);
    if (g.streak % 7 === 0) earn(state, REWARD.streakWeek, "streak", now);
  }
}
