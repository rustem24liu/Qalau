import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { freshWallet } from "./wallet";
import { activeGoal, exampleState, markDone, moveTask, newGoal, normalize, rollDaily, setPriority, sortByPriority } from "./goals";
import type { AppState, Goal, Priority, Task, Timer } from "./types";

// Tuesday, 29 Sep 2026, 10:00 local time
const NOW = new Date(2026, 8, 29, 10);
const TODAY = "2026-09-29", YESTERDAY = "2026-09-28", TWO_DAYS_AGO = "2026-09-27";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

const daily = (o: Partial<Goal> = {}): Goal => ({
  id: "d", type: "daily", title: "", day: TODAY, built: 0, streak: 0,
  tasks: [{ id: "a", text: "", done: false }, { id: "b", text: "", done: false }], ...o,
});
const stateOf = (...goals: Goal[]): AppState => ({ goals, timers: [], work: { acc: 0, from: null, stoppedAt: null, promptAt: 1 }, log: [], wallet: freshWallet() });

describe("newGoal", () => {
  it("gives daily goals a day and zero counters", () => {
    expect(newGoal("daily", "x")).toMatchObject({ type: "daily", day: TODAY, built: 0, streak: 0, tasks: [] });
    expect(newGoal("big", "x").day).toBeUndefined();
  });

  it("creates unique ids", () => {
    expect(newGoal("big", "").id).not.toBe(newGoal("big", "").id);
  });
});

describe("exampleState", () => {
  it("is already normalized", () => {
    const s = exampleState();
    const copy = structuredClone(s);
    normalize(copy);
    expect(copy).toEqual(s);
    expect(activeGoal(s).id).toBe(s.activeId);
  });
});

describe("normalize", () => {
  it("migrates the legacy single timer", () => {
    const tm: Timer = { mode: "up", goalId: "g", taskId: "t", start: 1, paused: null };
    const s = { goals: [newGoal("big", "")], timer: tm } as unknown as AppState;
    normalize(s);
    expect(s.timers).toEqual([tm]);
    expect("timer" in s).toBe(false);
    expect(s.work.acc).toBe(0);
  });

  it("repairs broken goals", () => {
    const s = stateOf({ id: "x", type: "huge" as never, title: "", tasks: null as never });
    normalize(s);
    expect(s.goals[0]).toMatchObject({ type: "big", tasks: [] });
  });

  it("never leaves the goal list empty", () => {
    const s = stateOf();
    normalize(s);
    expect(s.goals).toHaveLength(1);
    expect(s.activeId).toBe(s.goals[0].id);
  });
});

describe("activeGoal", () => {
  it("falls back to the first goal for an unknown id", () => {
    const s = stateOf(newGoal("big", "first"), newGoal("big", "second"));
    s.activeId = "gone";
    expect(activeGoal(s).title).toBe("first");
  });
});

describe("rollDaily", () => {
  it("does nothing on the same day", () => {
    const s = stateOf(daily({ tasks: [{ id: "a", text: "", done: true }] }));
    expect(rollDaily(s)).toBe(false);
    expect(s.goals[0].tasks[0].done).toBe(true);
  });

  it("clears checkmarks on a new day and keeps the streak if yesterday was built", () => {
    const s = stateOf(daily({ day: YESTERDAY, lastBuilt: YESTERDAY, streak: 4, tasks: [{ id: "a", text: "", done: true }] }));
    expect(rollDaily(s)).toBe(true);
    expect(s.goals[0]).toMatchObject({ day: TODAY, streak: 4 });
    expect(s.goals[0].tasks[0].done).toBe(false);
  });

  it("breaks the streak after a missed day", () => {
    const s = stateOf(daily({ day: TWO_DAYS_AGO, lastBuilt: TWO_DAYS_AGO, streak: 4 }));
    rollDaily(s);
    expect(s.goals[0].streak).toBe(0);
  });

  it("leaves other goal types alone", () => {
    const g = newGoal("big", "");
    g.tasks.push({ id: "a", text: "", done: true });
    expect(rollDaily(stateOf(g))).toBe(false);
    expect(g.tasks[0].done).toBe(true);
  });
});

describe("markDone", () => {
  it("stops the task's timer", () => {
    const g = daily();
    const s = stateOf(g);
    s.timers = [{ mode: "up", goalId: "d", taskId: "a", start: 0, paused: null }, { mode: "up", goalId: "d", taskId: "b", start: 0, paused: null }];
    markDone(s, g, g.tasks[0], true);
    expect(s.timers.map(t => t.taskId)).toEqual(["b"]);
  });

  it("builds today's hut and extends yesterday's streak", () => {
    const g = daily({ lastBuilt: YESTERDAY, streak: 2, built: 5 });
    const s = stateOf(g);
    const [a, b] = g.tasks;
    markDone(s, g, a, true);
    expect(g.streak).toBe(2);
    markDone(s, g, b, true);
    expect(g).toMatchObject({ streak: 3, built: 6, lastBuilt: TODAY });
  });

  it("starts a new streak after a gap", () => {
    const g = daily({ lastBuilt: TWO_DAYS_AGO, streak: 7 });
    const s = stateOf(g);
    [...g.tasks].forEach(t => markDone(s, g, t, true));
    expect(g.streak).toBe(1);
  });

  it("counts a day only once when tasks are unchecked and checked again", () => {
    const g = daily();
    const s = stateOf(g);
    [...g.tasks].forEach(t => markDone(s, g, t, true));
    const first = g.tasks[0];
    markDone(s, g, first, false);
    markDone(s, g, first, true);
    expect(g).toMatchObject({ streak: 1, built: 1 });
  });
});

describe("moveTask", () => {
  const ids = (g: Goal) => g.tasks.map(t => t.id).join("");
  const make = () => ({ ...newGoal("big", ""), tasks: [..."abcd"].map(id => ({ id, text: id, done: false })) });

  it("moves a task up and down", () => {
    const g = make();
    moveTask(g, "d", 0);
    expect(ids(g)).toBe("dabc");
    moveTask(g, "d", 2);
    expect(ids(g)).toBe("abdc");
  });

  it("clamps the target position", () => {
    const g = make();
    moveTask(g, "a", 99);
    expect(ids(g)).toBe("bcda");
    moveTask(g, "a", -5);
    expect(ids(g)).toBe("abcd");
  });

  it("ignores an unknown task", () => {
    const g = make();
    moveTask(g, "zz", 0);
    expect(ids(g)).toBe("abcd");
  });
});

describe("priority", () => {
  const task = (id: string, priority?: Priority, done = false): Task => ({ id, text: id, done, ...(priority && { priority }) });
  const ids = (g: Goal) => g.tasks.map(t => t.id).join(" ");

  it("sets and clears a priority", () => {
    const t = task("a");
    setPriority(t, "high");
    expect(t.priority).toBe("high");
    setPriority(t, null);
    expect("priority" in t).toBe(false);
  });

  it("sorts open tasks high → low → none, finished tasks last", () => {
    const g = { ...newGoal("big", ""), tasks: [task("none"), task("low", "low"), task("done", "high", true), task("high", "high"), task("mid", "medium")] };
    sortByPriority(g);
    expect(ids(g)).toBe("high mid low none done");
  });

  it("keeps the manual order among equal tasks", () => {
    const g = { ...newGoal("big", ""), tasks: [task("b", "high"), task("x"), task("a", "high"), task("y")] };
    sortByPriority(g);
    expect(ids(g)).toBe("b a x y");
  });

  it("normalize drops unknown priorities", () => {
    const s = stateOf({ ...newGoal("big", ""), tasks: [{ ...task("a"), priority: "urgent" as never }, task("b", "low")] });
    normalize(s);
    const byId = (id: string) => s.goals[0].tasks.find(t => t.id === id)!;
    expect("priority" in byId("a")).toBe(false);
    expect(byId("b").priority).toBe("low");
  });
});

describe("automatic task order", () => {
  const task = (id: string, priority?: Priority, done = false): Task => ({ id, text: id, done, ...(priority && { priority }) });
  const ids = (s: AppState) => s.goals[0].tasks.map(t => t.id).join(" ");
  const setup = (...tasks: Task[]) => { const s = stateOf({ ...newGoal("big", ""), tasks }); normalize(s); return s; };

  it("a checked task drops to the bottom, an unchecked one returns to its group", () => {
    const s = setup(task("a"), task("b"), task("c"));
    const g = s.goals[0];
    markDone(s, g, g.tasks[0], true); normalize(s);
    expect(ids(s)).toBe("b c a");
    markDone(s, g, g.tasks[0], true); normalize(s);
    expect(ids(s)).toBe("c a b"); // the newest finished task is the last one
    markDone(s, g, g.tasks.find(t => t.id === "a")!, false); normalize(s);
    expect(ids(s)).toBe("c a b"); // back among open tasks, at the end of its group
  });

  it("setting a priority lifts the task into its group", () => {
    const s = setup(task("x", "high"), task("a"), task("b"), task("c"));
    setPriority(s.goals[0].tasks[3], "high"); normalize(s);
    expect(ids(s)).toBe("x c a b");
    setPriority(s.goals[0].tasks[2], "low"); normalize(s);
    expect(ids(s)).toBe("x c a b");
    setPriority(s.goals[0].tasks[3], "medium"); normalize(s);
    expect(ids(s)).toBe("x c b a");
  });

  it("dragging works inside a group and snaps back across groups", () => {
    const s = setup(task("h1", "high"), task("h2", "high"), task("n1"), task("n2"));
    moveTask(s.goals[0], "h2", 0); normalize(s);
    expect(ids(s)).toBe("h2 h1 n1 n2");
    moveTask(s.goals[0], "n2", 0); normalize(s);
    expect(ids(s)).toBe("h2 h1 n2 n1"); // stays below the high ones, but first among its own group
  });

  it("a new day brings finished daily tasks back into order", () => {
    const g: Goal = { ...daily({ day: YESTERDAY }), tasks: [task("n"), task("u", "high", true)] };
    const s = stateOf(g);
    rollDaily(s);
    expect(ids(s)).toBe("u n");
  });
});
