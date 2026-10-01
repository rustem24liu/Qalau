import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exampleState } from "./goals";
import { loadState, saveState } from "./storage";

const KEY = "stroyka-v1";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
  });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("loadState", () => {
  it("starts with the example on first visit", () => {
    expect(loadState().example).toBe(true);
  });

  it("falls back to the example on corrupt data", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadState().example).toBe(true);
    localStorage.setItem(KEY, JSON.stringify({ goals: "nope" }));
    expect(loadState().example).toBe(true);
  });

  it("round-trips saved state", () => {
    const s = exampleState();
    delete s.example;
    s.goals[0].title = "Мой проект";
    saveState(s);
    const back = loadState();
    expect(back.goals[0].title).toBe("Мой проект");
    expect(back.example).toBeUndefined();
  });

  it("upgrades data saved by older versions", () => {
    const old = { goals: [{ id: "g", type: "big", title: "", tasks: [] }], timer: { mode: "up", goalId: "g", taskId: "t", start: 1, paused: null } };
    localStorage.setItem(KEY, JSON.stringify(old));
    const s = loadState();
    expect(s.timers).toHaveLength(1);
    expect(s.work).toBeDefined();
  });
});

describe("saveState", () => {
  it("survives a storage that throws (private mode, quota)", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } });
    expect(() => saveState(exampleState())).not.toThrow();
    expect(loadState().example).toBe(true);
  });
});
