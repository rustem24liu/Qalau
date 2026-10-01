import { describe, expect, it } from "vitest";
import { freshWallet } from "./wallet";
import { LOG_KEEP, LOG_MAX, lastActivity, logEvent, pruneLog } from "./log";
import { markDone, newGoal, normalize } from "./goals";
import { endRest, freshWork, startRest } from "./rest";
import type { AppState, Goal } from "./types";

const T0 = 1_800_000_000_000, m = 60_000;
const goal = (): Goal => ({ ...newGoal("big", ""), createdAt: T0, tasks: [{ id: "a", text: "", done: false }, { id: "b", text: "", done: false }] });
const state = (...goals: Goal[]): AppState => ({ goals, timers: [], work: freshWork(), log: [], wallet: freshWallet() });
const kinds = (s: AppState) => s.log.filter(e => e.kind !== "coins").map(e => e.kind); // coins are tested in wallet.test

describe("journal", () => {
  it("records checking and unchecking, but not repeats", () => {
    const g = goal(), s = state(g);
    markDone(s, g, g.tasks[0], true, T0 + m);
    markDone(s, g, g.tasks.find(t => t.id === "a")!, true, T0 + 2 * m); // already done
    markDone(s, g, g.tasks.find(t => t.id === "a")!, false, T0 + 3 * m);
    expect(kinds(s)).toEqual(["task_done", "task_undone"]);
    expect(s.log[0]).toMatchObject({ t: T0 + m, goalId: g.id, taskId: "a" });
  });

  it("records a completed daily hut", () => {
    const g: Goal = { ...goal(), type: "daily", day: "x" };
    const s = state(g);
    [...g.tasks].forEach(t => markDone(s, g, t, true, T0));
    expect(kinds(s)).toEqual(["task_done", "task_done", "hut_built"]);
  });

  it("records a break with its real length", () => {
    const s = state();
    startRest(s, T0, 10 * m);
    endRest(s, T0 + 4 * m); // ended early
    expect(s.log).toEqual([{ t: T0 + 4 * m, kind: "rest", ms: 4 * m }]);
  });

  it("drops old events and caps the size", () => {
    const s = state();
    logEvent(s, { kind: "rest", ms: 1 }, T0 - LOG_KEEP - 1);
    for (let i = 0; i < LOG_MAX + 10; i++) logEvent(s, { kind: "rest", ms: i }, T0);
    pruneLog(s, T0);
    expect(s.log).toHaveLength(LOG_MAX);
    expect(s.log.at(-1)).toMatchObject({ ms: LOG_MAX + 9 }); // newest kept
  });

  it("normalize adds a journal and creation dates to old data", () => {
    const s = { goals: [{ id: "g", type: "big", title: "", tasks: [] }], timers: [] } as unknown as AppState;
    normalize(s);
    expect(s.log).toEqual([]);
    expect(typeof s.goals[0].createdAt).toBe("number");
  });
});

describe("lastActivity", () => {
  it("is the latest event of the goal, or its creation", () => {
    const g = goal(), other = { ...goal(), id: "other" }, s = state(g, other);
    expect(lastActivity(s, g)).toBe(T0);
    markDone(s, g, g.tasks[0], true, T0 + 5 * m);
    markDone(s, other, other.tasks[0], true, T0 + 9 * m);
    expect(lastActivity(s, g)).toBe(T0 + 5 * m);
  });
});
