import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, daysBetween, dueLabel, dueState, forecast, isDay, setDue } from "./deadline";
import { markDone, newGoal, normalize } from "./goals";
import { freshWork } from "./rest";
import type { AppState, Goal, Task } from "./types";
import { freshWallet } from "./wallet";

// Tuesday, 29 Sep 2026, noon
const NOW = new Date(2026, 8, 29, 12);
const TODAY = "2026-09-29", DAY = 24 * 3600_000;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

const task = (id: string, extra: Partial<Task> = {}): Task => ({ id, text: id, done: false, ...extra });
const state = (...goals: Goal[]): AppState => ({ goals, timers: [], work: freshWork(), log: [], wallet: freshWallet() });

describe("dates", () => {
  it("counts days across months", () => {
    expect(daysBetween(TODAY, "2026-10-02")).toBe(3);
    expect(daysBetween(TODAY, "2026-09-27")).toBe(-2);
    expect(addDays(TODAY, 3)).toBe("2026-10-02");
  });

  it("validates YYYY-MM-DD", () => {
    expect(isDay("2026-10-02")).toBe(true);
    expect(isDay("02.10.2026")).toBe(false);
    expect(isDay("2026-13-40")).toBe(false);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay(42)).toBe(false);
  });
});

describe("due labels", () => {
  it.each([
    ["2026-09-27", "overdue", "просрочено 2 дн."],
    [TODAY, "today", "сегодня"],
    ["2026-09-30", "soon", "завтра"],
    ["2026-10-03", "later", "через 4 дн."],
  ])("%s → %s", (due, state, label) => {
    expect(dueState(due, TODAY)).toBe(state);
    expect(dueLabel(due, TODAY)).toBe(label);
  });

  it("far dates show the day and month", () => {
    expect(dueLabel("2026-11-14", TODAY)).toMatch(/^до 14 ноя/);
  });
});

describe("order by deadline", () => {
  it("overdue and today's tasks go first inside their priority group only", () => {
    const g: Goal = { ...newGoal("big", ""), tasks: [
      task("plain"), task("today", { due: TODAY }), task("late", { due: "2026-09-20" }),
      task("urgent", { priority: "high" }), task("later", { due: "2026-12-01" }),
    ] };
    const s = state(g);
    normalize(s);
    expect(s.goals[0].tasks.map(t => t.id)).toEqual(["urgent", "late", "today", "plain", "later"]);
  });

  it("setDue sets, clears and ignores bad dates; normalize drops daily goals' deadlines", () => {
    const t = task("a");
    setDue(t, "2026-10-01");
    expect(t.due).toBe("2026-10-01");
    setDue(t, "soon");
    expect("due" in t).toBe(false);
    const s = state({ ...newGoal("daily", ""), due: "2026-10-01" }, { ...newGoal("big", ""), due: "nope" });
    normalize(s);
    expect(s.goals.map(g => g.due)).toEqual([undefined, undefined]);
  });
});

describe("forecast", () => {
  // a goal created 14 days ago with 10 normal tasks
  const setup = (doneLately: number, due?: string) => {
    const g: Goal = { ...newGoal("big", ""), createdAt: Date.now() - 20 * DAY, tasks: Array.from({ length: 10 }, (_, i) => task("t" + i)), ...(due && { due }) };
    const s = state(g);
    for (let i = 0; i < doneLately; i++) markDone(s, g, g.tasks.find(t => !t.done)!, true, Date.now() - (i + 1) * DAY);
    return { s, g };
  };

  it("projects the finish date from the last two weeks", () => {
    const { s, g } = setup(7); // 7 tasks in 14 days = 0.5 task/day, 3 left → 6 days
    const f = forecast(s, g);
    expect(f.left).toBe(6);
    expect(f.eta).toBe(addDays(TODAY, 6));
    expect(f.onTrack).toBeNull();
  });

  it("a brand-new goal's pace is spread over at least 3 days", () => {
    const g: Goal = { ...newGoal("big", ""), createdAt: Date.now() - DAY / 2, tasks: Array.from({ length: 4 }, (_, i) => task("t" + i)) };
    const s = state(g);
    markDone(s, g, g.tasks[0], true, Date.now() - 1000); // 1 task today → 1/3 task a day, 3 left → 9 days
    expect(forecast(s, g).eta).toBe(addDays(TODAY, 9));
  });

  it("has no date without recent progress", () => {
    const { s, g } = setup(0);
    expect(forecast(s, g).eta).toBeNull();
  });

  it("checks the deadline and says how many tasks a week it takes", () => {
    const late = setup(2, addDays(TODAY, 6)); // 2 in 14 days, 8 left → 56 days
    expect(forecast(late.s, late.g)).toMatchObject({ onTrack: false, perWeek: 8 });
    const fine = setup(7, addDays(TODAY, 30));
    expect(forecast(fine.s, fine.g).onTrack).toBe(true);
  });

  it("a finished goal is on track today", () => {
    const { s, g } = setup(10, addDays(TODAY, -1));
    expect(forecast(s, g)).toMatchObject({ left: 0, eta: TODAY, onTrack: true });
  });
});
