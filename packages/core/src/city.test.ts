import { describe, expect, it } from "vitest";
import { cityPoints, LANDMARK_TASKS, landmarkFor, landmarkProgress, makeCity } from "./city";
import { newGoal, normalize } from "./goals";
import type { AppState, Goal } from "./types";

const state = (...goals: Goal[]): AppState => ({ goals, timers: [], work: { acc: 0, from: null, stoppedAt: null, promptAt: 1 } });
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
