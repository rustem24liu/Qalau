import { describe, expect, it } from "vitest";
import { builtCount, liveCount, piecesPerTask } from "./progress";
import type { Goal, TaskSize, Timer } from "./types";

const N = 100, m = 60_000, T0 = 1_000_000;
const goal = (done: boolean[]): Goal => ({
  id: "g", type: "big", title: "", tasks: done.map((d, i) => ({ id: "t" + i, text: "", done: d })),
});
const countdown = (taskId: string, share: number, goalId = "g"): Timer =>
  ({ mode: "down", goalId, taskId, start: T0 - share * 10 * m, dur: 10 * m, paused: null });

describe("builtCount", () => {
  it("is 0 without tasks", () => {
    expect(builtCount(goal([]), N)).toBe(0);
  });

  it("is proportional to finished tasks, rounded down", () => {
    expect(builtCount(goal([true, false, false]), N)).toBe(33);
    expect(builtCount(goal([true, true, false, false]), N)).toBe(50);
  });

  it("completes the building only when every task is done", () => {
    expect(builtCount(goal([true, true, true]), N)).toBe(N);
    expect(builtCount(goal([...Array(199).fill(true), false]), N)).toBe(N - 1);
  });
});

describe("liveCount", () => {
  const g = goal([true, false, false, false]); // 25 built

  it("equals builtCount without timers", () => {
    expect(liveCount(g, N, [], T0)).toBe(25);
  });

  it("adds a share of the running task", () => {
    expect(liveCount(g, N, [countdown("t1", 0.5)], T0)).toBe(37);
  });

  it("adds up parallel tasks", () => {
    expect(liveCount(g, N, [countdown("t1", 0.5), countdown("t2", 0.5)], T0)).toBe(50);
  });

  it("ignores timers of other goals and of finished tasks", () => {
    expect(liveCount(g, N, [countdown("t1", 0.5, "other")], T0)).toBe(25);
    expect(liveCount(g, N, [countdown("t0", 0.5)], T0)).toBe(25);
  });

  it("never finishes the building by timers alone", () => {
    const last = goal([true, true, true, false]);
    expect(liveCount(last, N, [countdown("t3", 1)], T0)).toBe(N - 1);
  });
});

describe("task size", () => {
  const sized = (sizes: (TaskSize | undefined)[], done: boolean[]): Goal => ({
    id: "g", type: "big", title: "", tasks: sizes.map((size, i) => ({ id: "t" + i, text: "", done: done[i], ...(size && { size }) })),
  });

  it("a large task builds three times a small one", () => {
    // S + L = weight 4; finishing L builds 3/4, finishing S builds 1/4
    expect(builtCount(sized(["S", "L"], [false, true]), N)).toBe(75);
    expect(builtCount(sized(["S", "L"], [true, false]), N)).toBe(25);
  });

  it("tasks without a size count as M", () => {
    expect(builtCount(sized([undefined, "M"], [true, false]), N)).toBe(50);
  });

  it("a timer adds a share of its own task's weight", () => {
    const g = sized(["S", "L"], [false, false]);
    expect(liveCount(g, N, [countdown("t1", 0.5)], T0)).toBe(37); // half of 3/4
    expect(liveCount(g, N, [countdown("t0", 0.5)], T0)).toBe(12); // half of 1/4
  });

  it("estimates pieces per task", () => {
    const g = sized(["S", "M", "L"], [false, false, false]);
    expect(g.tasks.map(t => piecesPerTask(g, 60, t))).toEqual([10, 20, 30]);
  });
});
