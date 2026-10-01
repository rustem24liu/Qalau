import { describe, expect, it } from "vitest";
import { elapsed, isExpired, runningTimers, SW_TAU, timerProgress, togglePause } from "./timer";
import type { Timer } from "./types";

const m = 60_000, T0 = 1_000_000;
const up = (o: Partial<Timer> = {}): Timer => ({ mode: "up", goalId: "g", taskId: "t", start: T0, paused: null, ...o } as Timer);
const down = (dur: number, o: Partial<Timer> = {}): Timer => ({ mode: "down", goalId: "g", taskId: "t", start: T0, paused: null, dur, ...o } as Timer);

describe("elapsed", () => {
  it("counts from start while running", () => {
    expect(elapsed(up(), T0 + 5 * m)).toBe(5 * m);
  });

  it("is frozen while paused", () => {
    expect(elapsed(up({ paused: 3 * m }), T0 + 50 * m)).toBe(3 * m);
  });
});

describe("timerProgress", () => {
  it("countdown grows linearly and caps at 1", () => {
    expect(timerProgress(down(10 * m), T0)).toBe(0);
    expect(timerProgress(down(10 * m), T0 + 5 * m)).toBe(0.5);
    expect(timerProgress(down(10 * m), T0 + 30 * m)).toBe(1);
  });

  it("stopwatch slows down and never passes 90% of the task", () => {
    const at = (ms: number) => timerProgress(up(), T0 + ms);
    expect(at(0)).toBe(0);
    expect(at(SW_TAU)).toBeCloseTo(0.9 * (1 - Math.exp(-1)));
    expect(at(10 * SW_TAU)).toBeLessThan(0.9);
    expect(at(10 * m)).toBeLessThan(at(20 * m));
  });
});

describe("isExpired", () => {
  it("is true only for a running countdown past its duration", () => {
    expect(isExpired(down(10 * m), T0 + 9 * m)).toBe(false);
    expect(isExpired(down(10 * m), T0 + 10 * m)).toBe(true);
    expect(isExpired(down(10 * m, { paused: 5 * m }), T0 + 60 * m)).toBe(false);
    expect(isExpired(up(), T0 + 600 * m)).toBe(false);
  });
});

describe("togglePause", () => {
  it("pause then resume keeps the elapsed time", () => {
    const tm = up();
    togglePause(tm, T0 + 4 * m);
    expect(tm.paused).toBe(4 * m);
    togglePause(tm, T0 + 30 * m); // resumed 26 min later
    expect(tm.paused).toBeNull();
    expect(elapsed(tm, T0 + 31 * m)).toBe(5 * m);
  });
});

describe("runningTimers", () => {
  it("skips paused timers and filters by goal", () => {
    const list = [up({ taskId: "a" }), up({ taskId: "b", paused: 1 }), up({ taskId: "c", goalId: "other" })];
    expect(runningTimers(list).map(t => t.taskId)).toEqual(["a", "c"]);
    expect(runningTimers(list, "g").map(t => t.taskId)).toEqual(["a"]);
  });
});
