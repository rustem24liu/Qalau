import { describe, expect, it } from "vitest";
import { freshWallet } from "./wallet";
import { CITY_LEVELS, cityLevel, cityPoints, LANDMARK_TASKS, landmarkFor, landmarkProgress, levelProgress, makeCity } from "./city";
import { newGoal, normalize } from "./goals";
import type { AppState, Goal } from "./types";

const state = (...goals: Goal[]): AppState => ({ goals, timers: [], work: { acc: 0, from: null, stoppedAt: null, promptAt: 1 }, log: [], wallet: freshWallet() });
const withTasks = (type: Goal["type"], done: boolean[], extra: Partial<Goal> = {}): Goal =>
  ({ ...newGoal(type, ""), tasks: done.map((d, i) => ({ id: "t" + i, text: "", done: d })), ...extra });

describe("landmarkFor", () => {
  it.each([
    ["Астана", "baiterek"], ["астана", "baiterek"], ["Nur-Sultan", "baiterek"], ["г. Астана", "baiterek"],
    ["Алматы", "koktobe"], ["Алма-Ата", "koktobe"], ["almaty", "koktobe"],
    ["Шымкент", "townhall"], ["Москва", "townhall"],
  ])("%s → %s", (name, lm) => {
    expect(landmarkFor(name)).toBe(lm);
  });
});

describe("makeCity", () => {
  it("cleans up the name", () => {
    expect(makeCity("  Алматы   город ")).toEqual({ name: "Алматы город", landmark: "koktobe" });
    expect(makeCity("x".repeat(100))!.name).toHaveLength(40);
  });

  it("rejects an empty answer", () => {
    expect(makeCity("   ")).toBeNull();
  });
});

describe("cityPoints", () => {
  it("counts checked tasks of regular goals and completed daily huts", () => {
    const s = state(
      withTasks("big", [true, true, false]),
      withTasks("medium", [true]),
      withTasks("daily", [true, true], { built: 5 }), // today's checkmarks don't count twice
    );
    expect(cityPoints(s)).toBe(3 + 5);
  });

  it("caps landmark progress at 1", () => {
    expect(landmarkProgress(state(withTasks("big", Array(LANDMARK_TASKS / 2).fill(true))))).toBe(0.5);
    expect(landmarkProgress(state(withTasks("big", Array(LANDMARK_TASKS * 2).fill(true))))).toBe(1);
  });
});

describe("normalize city", () => {
  it("repairs a saved city", () => {
    const s = state(newGoal("big", ""));
    s.city = { name: "Астана", landmark: "eiffel" as never };
    normalize(s);
    expect(s.city!.landmark).toBe("baiterek");
    s.city = { name: " ", landmark: "townhall" };
    normalize(s);
    expect(s.city).toBeNull();
  });
});

describe("city levels", () => {
  it("grows with points", () => {
    expect(CITY_LEVELS[cityLevel(0)].name).toBe("Посёлок");
    expect(CITY_LEVELS[cityLevel(14)].name).toBe("Посёлок");
    expect(CITY_LEVELS[cityLevel(15)].name).toBe("Городок");
    expect(CITY_LEVELS[cityLevel(10_000)].name).toBe("Мегаполис");
  });

  it("levels need more and more work", () => {
    const steps = CITY_LEVELS.slice(1).map((l, i) => l.from - CITY_LEVELS[i].from);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });

  it("reports progress to the next level", () => {
    expect(levelProgress(20)).toEqual({ level: 1, into: 5, need: 25 });
    expect(levelProgress(500)).toMatchObject({ level: CITY_LEVELS.length - 1, need: null });
  });
});
