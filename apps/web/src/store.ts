import {
  activeGoal, elapsed, fmtDur, loadState, markDone, newGoal, newTask, normalize, rollDaily, saveState, today, togglePause,
  type AppState, type Goal, type GoalType,
} from "@qalau/core";
import { create } from "zustand";
import { chime } from "./lib/audio";

interface Store {
  state: AppState;
  /** Clock for the running timer; ticks only while one is running. */
  now: number;
  toast: { id: number; text: string } | null;

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
  toggleTask(id: string, done: boolean): void;

  startStopwatch(taskId: string): void;
  startCountdown(taskId: string, minutes: number): void;
  togglePause(): void;
  cancelTimer(): void;
  /** Finish the running task. `early` = before the countdown ran out. */
  finishTimer(early: boolean): void;
}

const withActive = (fn: (g: Goal, s: AppState) => void) => (s: AppState) => fn(activeGoal(s), s);

export const useStore = create<Store>()((set, get) => ({
  state: loadState(),
  now: Date.now(),
  toast: null,

  tick: () => set({ now: Date.now() }),
  showToast: text => set({ toast: { id: Date.now(), text } }),

  update(fn) {
    const next = structuredClone(get().state);
    fn(next);
    delete next.example;
    normalize(next);
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
    if (s.timer?.goalId === id) s.timer = null;
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
    if (s.timer?.taskId === id) s.timer = null;
    g.tasks = g.tasks.filter(t => t.id !== id);
  })),

  toggleTask: (id, done) => get().update(withActive((g, s) => {
    const t = g.tasks.find(x => x.id === id);
    if (t) markDone(s, g, t, done);
  })),

  startStopwatch: taskId => get().update(s => {
    s.timer = { mode: "up", goalId: activeGoal(s).id, taskId, start: Date.now(), paused: null };
  }),

  startCountdown: (taskId, minutes) => get().update(s => {
    s.timer = { mode: "down", goalId: activeGoal(s).id, taskId, start: Date.now(), dur: minutes * 60000, paused: null };
  }),

  togglePause: () => get().update(s => { if (s.timer) togglePause(s.timer); }),

  cancelTimer: () => get().update(s => { s.timer = null; }),

  finishTimer(early) {
    const tm = get().state.timer;
    if (!tm) return;
    const task = get().state.goals.find(x => x.id === tm.goalId)?.tasks.find(x => x.id === tm.taskId);
    const spent = tm.mode === "up" || early ? elapsed(tm) : tm.dur;
    get().update(s => {
      s.timer = null;
      const g = s.goals.find(x => x.id === tm.goalId), t = g?.tasks.find(x => x.id === tm.taskId);
      if (!g || !t) return;
      t.spent = (t.spent || 0) + spent;
      markDone(s, g, t, true);
    });
    if (task) get().showToast(tm.mode === "down" && !early ? `Время вышло — «${task.text}» построена!` : `«${task.text}» — готово за ${fmtDur(spent)}!`);
    chime();
  },
}));

export const useActiveGoal = () => useStore(s => activeGoal(s.state));
