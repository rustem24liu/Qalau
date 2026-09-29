import {
  activeGoal, elapsed, endRest, fmtDur, MAX_PARALLEL, resumeTask, snoozeRest, wake, startRest, syncWork, loadState, markDone, moveTask, setPriority, sortByPriority, newGoal, newTask, normalize, rollDaily, saveState, today, togglePause,
  type AppState, type Goal, type GoalType, type Priority, type Timer,
} from "@qalau/core";
import { create } from "zustand";
import { chime } from "./lib/audio";

interface Store {
  state: AppState;
  /** Clock for running timers; ticks only while one is running. */
  now: number;
  toast: { id: number; text: string } | null;
  /** Bumped when a break ends — the builder cheers. */
  cheer: number;

  tick(): void;
  showToast(text: string): void;
  /** Apply a mutation to a copy of the state and persist it. */
  update(fn: (s: AppState) => void): void;
  /** Reset daily goals if the date changed. */
  rollDay(): void;

  selectGoal(id: string): void;
  addGoal(type: GoalType): void;
  deleteActiveGoal(): void;
  renameGoal(title: string): void;
  setGoalType(type: GoalType): void;

  addTask(text: string): void;
  removeTask(id: string): void;
  /** Reorders tasks of the active goal: put `id` at position `to`. */
  moveTask(id: string, to: number): void;
  setPriority(id: string, p: Priority | null): void;
  /** Reorders the active goal's tasks by priority, finished ones last. */
  sortByPriority(): void;
  toggleTask(id: string, done: boolean): void;

  /** Start a task in the active goal; ignored at MAX_PARALLEL or if it already runs. */
  startStopwatch(taskId: string): void;
  startCountdown(taskId: string, minutes: number): void;
  togglePause(taskId: string): void;
  cancelTimer(taskId: string): void;
  /** Finish a running task. `early` = before the countdown ran out. */
  finishTimer(taskId: string, early: boolean): void;

  /** Builder's break: pause everything for REST_FOR, then resume. */
  startRest(): void;
  endRest(): void;
  snoozeRest(): void;
}

type TimerBase = { goalId: string; taskId: string; start: number; paused: null };

/** Adds a timer for a task of the active goal, respecting the parallel limit. */
function startTimer(s: AppState, taskId: string, make: (base: TimerBase) => Timer): void {
  if (s.timers.length >= MAX_PARALLEL || s.timers.some(tm => tm.taskId === taskId)) return;
  wake(s);
  s.timers.push(make({ goalId: activeGoal(s).id, taskId, start: Date.now(), paused: null }));
}

const withActive = (fn: (g: Goal, s: AppState) => void) => (s: AppState) => fn(activeGoal(s), s);

export const useStore = create<Store>()((set, get) => ({
  state: loadState(),
  now: Date.now(),
  toast: null,
  cheer: 0,

  tick: () => set({ now: Date.now() }),
  showToast: text => set({ toast: { id: Date.now(), text } }),

  update(fn) {
    const next = structuredClone(get().state);
    fn(next);
    delete next.example;
    normalize(next);
    syncWork(next);
    saveState(next);
    set({ state: next, now: Date.now() });
  },

  rollDay() {
    const next = structuredClone(get().state);
    if (!rollDaily(next)) return;
    if (!next.example) saveState(next);
    set({ state: next });
  },

  selectGoal: id => get().update(s => { s.activeId = id; }),

  addGoal: type => get().update(s => {
    const g = newGoal(type, type === "daily" ? "Мой день" : "Новая цель");
    s.goals.push(g);
    s.activeId = g.id;
  }),

  deleteActiveGoal: () => get().update(s => {
    const id = activeGoal(s).id;
    s.timers = s.timers.filter(tm => tm.goalId !== id);
    s.goals = s.goals.filter(g => g.id !== id);
    s.activeId = s.goals[0]?.id;
  }),

  renameGoal: title => get().update(withActive(g => { g.title = title; })),

  setGoalType: type => get().update(withActive(g => {
    g.type = type;
    if (type === "daily" && !g.day) Object.assign(g, { day: today(), built: g.built || 0, streak: g.streak || 0 });
  })),

  addTask: text => get().update(withActive(g => { g.tasks.push(newTask(text)); })),

  removeTask: id => get().update(withActive((g, s) => {
    s.timers = s.timers.filter(tm => tm.taskId !== id);
    g.tasks = g.tasks.filter(t => t.id !== id);
  })),

  moveTask: (id, to) => get().update(withActive(g => moveTask(g, id, to))),

  setPriority: (id, p) => get().update(withActive(g => {
    const t = g.tasks.find(x => x.id === id);
    if (t) setPriority(t, p);
  })),

  sortByPriority: () => get().update(withActive(g => sortByPriority(g))),

  toggleTask: (id, done) => get().update(withActive((g, s) => {
    const t = g.tasks.find(x => x.id === id);
    if (t) markDone(s, g, t, done);
  })),

  startStopwatch: taskId => get().update(s => startTimer(s, taskId, base => ({ ...base, mode: "up" }))),

  startCountdown: (taskId, minutes) =>
    get().update(s => startTimer(s, taskId, base => ({ ...base, mode: "down", dur: minutes * 60000 }))),

  togglePause: taskId => get().update(s => {
    const tm = s.timers.find(x => x.taskId === taskId);
    if (!tm) return;
    if (tm.paused != null) resumeTask(s, taskId);
    else togglePause(tm);
  }),

  cancelTimer: taskId => get().update(s => { s.timers = s.timers.filter(tm => tm.taskId !== taskId); }),

  finishTimer(taskId, early) {
    const tm = get().state.timers.find(x => x.taskId === taskId);
    if (!tm) return;
    const task = get().state.goals.find(x => x.id === tm.goalId)?.tasks.find(x => x.id === tm.taskId);
    const spent = tm.mode === "up" || early ? elapsed(tm) : tm.dur;
    get().update(s => {
      s.timers = s.timers.filter(x => x.taskId !== taskId);
      const g = s.goals.find(x => x.id === tm.goalId), t = g?.tasks.find(x => x.id === tm.taskId);
      if (!g || !t) return;
      t.spent = (t.spent || 0) + spent;
      markDone(s, g, t, true);
    });
    if (task) get().showToast(tm.mode === "down" && !early ? `Время вышло — «${task.text}» построена!` : `«${task.text}» — готово за ${fmtDur(spent)}!`);
    chime();
  },

  startRest: () => get().update(s => startRest(s)),

  endRest() {
    if (!get().state.rest) return;
    get().update(s => endRest(s));
    set(st => ({ cheer: st.cheer + 1 }));
    get().showToast("Строитель отдохнул и полон сил — продолжаем!");
    chime();
  },

  snoozeRest: () => get().update(s => snoozeRest(s)),
}));

export const useActiveGoal = () => useStore(s => activeGoal(s.state));
