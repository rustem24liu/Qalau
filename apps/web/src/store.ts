import {
  activeGoal, buy, CITY_LEVELS, cityLevel, cityPoints, earn, elapsed, focusCoins, logEvent, payLevels, REWARD, setRoof, touchGoal, type BuyResult, type RoofId, endRest, extendRest, fmtDur, MAX_PARALLEL, resumeTask, snoozeRest, wake, startRest, syncWork, loadState, makeCity, markDone, moveTask, setPriority, newGoal, newTask, normalize, rollDaily, saveState, today, togglePause,
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
  /** Screen: one goal's building site, the whole city, or the shop. Not saved. */
  view: "site" | "city" | "shop";

  tick(): void;
  showToast(text: string): void;
  /** Apply a mutation to a copy of the state and persist it. */
  update(fn: (s: AppState) => void): void;
  /** Reset daily goals if the date changed. */
  rollDay(): void;

  setView(view: "site" | "city" | "shop"): void;
  buy(itemId: string): BuyResult;
  setRoof(roof: RoofId | null): void;
  /** Replaces everything with a restored backup. */
  replaceState(state: AppState): void;
  /** "I'll come back to it" for a neglected goal. */
  touchGoal(goalId: string): void;
  /** Saves the user's city from their answer; false if the answer is empty. */
  setCity(name: string): boolean;
  /** From the city: open a goal's building site. */
  openGoal(id: string): void;

  selectGoal(id: string): void;
  addGoal(type: GoalType): void;
  deleteActiveGoal(): void;
  renameGoal(title: string): void;
  setGoalType(type: GoalType): void;

  addTask(text: string): void;
  removeTask(id: string): void;
  /** Reorders tasks of the active goal: put `id` at position `to` (within its priority group — normalize re-sorts). */
  moveTask(id: string, to: number): void;
  setPriority(id: string, p: Priority | null): void;
  toggleTask(id: string, done: boolean): void;

  /** Start a task in the active goal; ignored at MAX_PARALLEL or if it already runs. */
  startStopwatch(taskId: string): void;
  startCountdown(taskId: string, minutes: number): void;
  togglePause(taskId: string): void;
  cancelTimer(taskId: string): void;
  /** Finish a running task. `early` = before the countdown ran out. */
  finishTimer(taskId: string, early: boolean): void;

  /** Builder's break: pause everything for `minutes` (default REST_FOR), then resume. */
  startRest(minutes?: number): void;
  extendRest(minutes: number): void;
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
  view: "site",

  tick: () => set({ now: Date.now() }),
  showToast: text => set({ toast: { id: Date.now(), text } }),

  update(fn) {
    const prev = get().state;
    const next = structuredClone(prev);
    fn(next);
    delete next.example;
    normalize(next);
    syncWork(next);
    const was = cityLevel(cityPoints(prev)), is = cityLevel(cityPoints(next));
    payLevels(next, is);
    saveState(next);
    set({ state: next, now: Date.now() });
    // the city reached a new level
    if (is > was && !prev.example) get().showToast(`Город вырос: теперь это ${CITY_LEVELS[is].name}! Открыто: ${CITY_LEVELS[is].perk.toLowerCase()} · +${REWARD.level} монет`);
  },

  rollDay() {
    const next = structuredClone(get().state);
    if (!rollDaily(next)) return;
    if (!next.example) saveState(next);
    set({ state: next });
  },

  setView: view => set({ view }),

  buy(itemId) {
    let res: BuyResult = "unknown";
    get().update(s => { res = buy(s, itemId); });
    return res;
  },

  setRoof: roof => get().update(s => setRoof(s, roof)),

  touchGoal: goalId => get().update(s => touchGoal(s, goalId)),

  replaceState(state) {
    saveState(state);
    set({ state, view: "site", now: Date.now() });
  },

  setCity(name) {
    const city = makeCity(name);
    if (city) get().update(s => { s.city = city; });
    return !!city;
  },

  openGoal(id) {
    get().selectGoal(id);
    set({ view: "site" });
  },

  selectGoal: id => get().update(s => { s.activeId = id; }),

  addGoal: type => get().update(s => {
    const g = newGoal(type, type === "daily" ? "Мой день" : "Новая цель");
    s.goals.push(g);
    logEvent(s, { kind: "goal_created", goalId: g.id });
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

  addTask: text => get().update(withActive((g, s) => {
    const t = newTask(text);
    g.tasks.push(t);
    logEvent(s, { kind: "task_added", goalId: g.id, taskId: t.id });
  })),

  removeTask: id => get().update(withActive((g, s) => {
    s.timers = s.timers.filter(tm => tm.taskId !== id);
    g.tasks = g.tasks.filter(t => t.id !== id);
  })),

  moveTask: (id, to) => get().update(withActive(g => moveTask(g, id, to))),

  setPriority: (id, p) => get().update(withActive(g => {
    const t = g.tasks.find(x => x.id === id);
    if (t) setPriority(t, p);
  })),

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
      logEvent(s, { kind: "focus", goalId: g.id, taskId: t.id, ms: spent });
      earn(s, focusCoins(spent), "focus");
      markDone(s, g, t, true);
    });
    if (task) get().showToast(tm.mode === "down" && !early ? `Время вышло — «${task.text}» построена!` : `«${task.text}» — готово за ${fmtDur(spent)}!`);
    chime();
  },

  startRest: minutes => get().update(s => startRest(s, Date.now(), minutes ? minutes * 60000 : undefined)),

  extendRest: minutes => get().update(s => extendRest(s, minutes * 60000)),

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
