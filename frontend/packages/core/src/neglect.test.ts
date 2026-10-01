import { describe, expect, it } from "vitest";
import { markDone, newGoal } from "./goals";
import { ABANDONED_AFTER, idleDays, neglectOf, OVERGROWN_AFTER, touchGoal } from "./neglect";
import { freshWork } from "./rest";
import type { AppState, Goal } from "./types";
import { freshWallet } from "./wallet";

const T0 = 1_800_000_000_000, DAY = 24 * 3600_000;
const goal = (done = [false, false]): Goal => ({ ...newGoal("big", ""), createdAt: T0, tasks: done.map((d, i) => ({ id: "t" + i, text: "", done: d })) });
const state = (...goals: Goal[]): AppState => ({ goals, timers: [], work: freshWork(), log: [], wallet: freshWallet() });

describe("neglect", () => {
  it("overgrows after two weeks and is abandoned after a month", () => {
    const g = goal(), s = state(g);
    expect(neglectOf(s, g, T0 + OVERGROWN_AFTER - 1)).toBe(0);
    expect(neglectOf(s, g, T0 + OVERGROWN_AFTER)).toBe(1);
    expect(neglectOf(s, g, T0 + ABANDONED_AFTER)).toBe(2);
    expect(idleDays(s, g, T0 + 20 * DAY)).toBe(20);
  });

  it("any progress on the goal clears it", () => {
    const g = goal(), s = state(g);
    const later = T0 + 40 * DAY;
    markDone(s, g, g.tasks[0], true, later);
    expect(neglectOf(s, g, later + DAY)).toBe(0);
  });

  it("'I'll come back to it' clears it too", () => {
    const g = goal(), s = state(g);
    touchGoal(s, g.id, T0 + 40 * DAY);
    expect(neglectOf(s, g, T0 + 41 * DAY)).toBe(0);
  });

  it("other goals' activity does not count", () => {
    const g = goal(), other = { ...goal(), id: "o" }, s = state(g, other);
    markDone(s, other, other.tasks[0], true, T0 + 20 * DAY);
    expect(neglectOf(s, g, T0 + 20 * DAY)).toBe(1);
  });

  it("a finished building never gets overgrown", () => {
    const g = goal([true, true]), s = state(g);
    expect(neglectOf(s, g, T0 + 100 * DAY)).toBe(0);
  });
});
