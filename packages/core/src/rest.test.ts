import { describe, expect, it } from "vitest";
import { REST_FOR, REST_MAX, REST_MIN, SNOOZE_FOR, TIRED_AFTER } from "./constants";
import { endRest, extendRest, freshWork, isTired, restLeft, resumeTask, snoozeRest, startRest, syncWork, wake, workedMs } from "./rest";
import { togglePause } from "./timer";
import type { AppState, Timer } from "./types";

const m = 60_000, T0 = 1_000_000_000;
const timer = (taskId: string): Timer => ({ mode: "up", goalId: "g", taskId, start: T0, paused: null });

/** Two tasks running since T0, work clock started. */
function working(): AppState {
  const s: AppState = { goals: [], timers: [timer("a"), timer("b")], work: freshWork() };
  syncWork(s, T0);
  return s;
}

describe("work clock", () => {
  it("counts wall time once, however many tasks run in parallel", () => {
    expect(workedMs(working().work, T0 + 30 * m)).toBe(30 * m);
  });

  it("stops when every task is paused", () => {
    const s = working();
    s.timers.forEach(t => togglePause(t, T0 + 20 * m));
    syncWork(s, T0 + 20 * m);
    expect(workedMs(s.work, T0 + 25 * m)).toBe(20 * m);
  });

  it("treats a self-taken break of REST_FOR as rest", () => {
    const s = working();
    s.timers.forEach(t => togglePause(t, T0 + 40 * m));
    syncWork(s, T0 + 40 * m);
    const back = T0 + 40 * m + REST_FOR;
    s.timers.forEach(t => togglePause(t, back));
    syncWork(s, back);
    expect(workedMs(s.work, back)).toBe(0);
  });

  it("keeps fatigue after a short pause", () => {
    const s = working();
    s.timers.forEach(t => togglePause(t, T0 + 40 * m));
    syncWork(s, T0 + 40 * m);
    const back = T0 + 40 * m + REST_FOR / 2;
    s.timers.forEach(t => togglePause(t, back));
    syncWork(s, back);
    expect(workedMs(s.work, back + 10 * m)).toBe(50 * m);
  });
});

describe("isTired", () => {
  it("turns on after TIRED_AFTER of work", () => {
    const s = working();
    expect(isTired(s, T0 + TIRED_AFTER - 1)).toBe(false);
    expect(isTired(s, T0 + TIRED_AFTER)).toBe(true);
  });

  it("is off while nothing runs", () => {
    const s = working();
    s.timers.forEach(t => togglePause(t, T0 + TIRED_AFTER));
    syncWork(s, T0 + TIRED_AFTER);
    expect(isTired(s, T0 + TIRED_AFTER + m)).toBe(false);
  });

  it("'later' asks again after SNOOZE_FOR more work", () => {
    const s = working();
    snoozeRest(s, T0 + TIRED_AFTER);
    expect(isTired(s, T0 + TIRED_AFTER + SNOOZE_FOR - 1)).toBe(false);
    expect(isTired(s, T0 + TIRED_AFTER + SNOOZE_FOR)).toBe(true);
  });
});

describe("rest", () => {
  const t1 = T0 + TIRED_AFTER;

  it("pauses running tasks and remembers them", () => {
    const s = working();
    togglePause(s.timers[1], T0 + m); // b was already paused by the user
    startRest(s, t1);
    expect(s.timers.every(t => t.paused != null)).toBe(true);
    expect(s.rest).toMatchObject({ start: t1, dur: REST_FOR, resume: ["a"] });
    expect(isTired(s, t1)).toBe(false);
  });

  it("counts down", () => {
    const s = working();
    startRest(s, t1);
    expect(restLeft(s.rest!, t1 + REST_FOR / 4)).toBe(REST_FOR * 0.75);
    expect(restLeft(s.rest!, t1 + REST_FOR + m)).toBe(0);
  });

  it("ending it resumes only the tasks it paused and resets fatigue", () => {
    const s = working();
    togglePause(s.timers[1], T0 + m);
    startRest(s, t1);
    const t2 = t1 + REST_FOR;
    endRest(s, t2);
    expect(s.rest).toBeNull();
    expect(s.timers[0].paused).toBeNull();
    expect(s.timers[1].paused).not.toBeNull();
    expect(workedMs(s.work, t2)).toBe(0);
    expect(s.work.from).toBe(t2);
  });

  it("does not count the break as task time", () => {
    const s = working();
    startRest(s, t1);
    endRest(s, t1 + REST_FOR);
    const tm = s.timers[0];
    expect(t1 + REST_FOR + m - tm.start).toBe(TIRED_AFTER + m);
  });

  it("endRest without a break is a no-op", () => {
    const s = working();
    const before = structuredClone(s);
    endRest(s, t1);
    expect(s).toEqual(before);
  });
});

describe("waking up", () => {
  const t1 = T0 + TIRED_AFTER;

  it("resuming a task during a break ends the break", () => {
    const s = working();
    startRest(s, t1);
    resumeTask(s, "a", t1 + m);
    expect(s.rest).toBeNull();
    expect(s.timers.every(t => t.paused == null)).toBe(true); // "b" was paused by the break, so it resumes too
    expect(isTired(s, t1 + m)).toBe(false);
  });

  it("resumes a task the user had paused before the break", () => {
    const s = working();
    togglePause(s.timers[1], T0 + m);
    startRest(s, t1);
    resumeTask(s, "b", t1 + m);
    expect(s.rest).toBeNull();
    expect(s.timers.map(t => t.paused)).toEqual([null, null]);
  });

  it("never leaves a task running while resting", () => {
    const s = working();
    startRest(s, t1);
    resumeTask(s, "a", t1 + m);
    expect(!!s.rest && s.timers.some(t => t.paused == null)).toBe(false);
  });

  it("wake is a no-op when not resting", () => {
    const s = working();
    const before = structuredClone(s);
    wake(s, t1);
    expect(s).toEqual(before);
  });
});

describe("break length", () => {
  const t1 = T0 + 20 * m;

  it("takes a break of the chosen length at any time", () => {
    const s = working();
    expect(isTired(s, t1)).toBe(false);
    startRest(s, t1, 25 * m);
    expect(s.rest).toMatchObject({ dur: 25 * m, resume: ["a", "b"] });
    expect(restLeft(s.rest!, t1 + 5 * m)).toBe(20 * m);
  });

  it("clamps silly lengths", () => {
    const a = working(); startRest(a, t1, 0);
    expect(a.rest!.dur).toBe(REST_FOR);
    const b = working(); startRest(b, t1, 10);
    expect(b.rest!.dur).toBe(REST_MIN);
    const c = working(); startRest(c, t1, 999 * m);
    expect(c.rest!.dur).toBe(REST_MAX);
  });

  it("ignores a second start, so paused tasks are not forgotten", () => {
    const s = working();
    startRest(s, t1, 5 * m);
    startRest(s, t1 + m, 30 * m);
    expect(s.rest).toMatchObject({ start: t1, dur: 5 * m, resume: ["a", "b"] });
  });

  it("extends the current break up to the maximum", () => {
    const s = working();
    extendRest(s, 5 * m); // not resting: nothing happens
    expect(s.rest).toBeUndefined();
    startRest(s, t1, 10 * m);
    extendRest(s, 5 * m);
    expect(s.rest!.dur).toBe(15 * m);
    extendRest(s, 999 * m);
    expect(s.rest!.dur).toBe(REST_MAX);
  });
});
