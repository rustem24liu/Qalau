import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markDone, newGoal, normalize, rollDaily } from "./goals";
import { endRest, freshWork, startRest } from "./rest";
import type { AppState, Goal } from "./types";
import { buy, focusCoins, freshWallet, payLevels, REWARD, SHOP, setRoof } from "./wallet";

const m = 60_000;
const goal = (type: Goal["type"] = "big", n = 2): Goal => ({ ...newGoal(type, ""), tasks: Array.from({ length: n }, (_, i) => ({ id: "t" + i, text: "", done: false })) });
const state = (...goals: Goal[]): AppState => ({ goals, timers: [], work: freshWork(), log: [], wallet: freshWallet() });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 29, 10)); });
afterEach(() => { vi.useRealTimers(); });

describe("earning", () => {
  it("pays for a finished task once — toggling does not farm coins", () => {
    const g = goal(), s = state(g), t = g.tasks[0];
    markDone(s, g, t, true);
    markDone(s, g, t, false);
    markDone(s, g, t, true);
    expect(s.wallet.coins).toBe(REWARD.task);
  });

  it("pays for a daily hut, and a bonus every week of streak", () => {
    const g: Goal = { ...goal("daily"), lastBuilt: "2026-09-28", streak: 6 };
    const s = state(g);
    [...g.tasks].forEach(t => markDone(s, g, t, true));
    expect(g.streak).toBe(7);
    expect(s.wallet.coins).toBe(2 * REWARD.task + REWARD.hut + REWARD.streakWeek);
  });

  it("daily tasks pay again on a new day", () => {
    const g: Goal = { ...goal("daily", 1), day: "2026-09-28" };
    const s = state(g);
    g.tasks[0].rewarded = true;
    rollDaily(s);
    markDone(s, g, g.tasks[0], true);
    expect(s.wallet.coins).toBe(REWARD.task + REWARD.hut);
  });

  it("pays for focus by 5-minute blocks, capped per session", () => {
    expect(focusCoins(4 * m)).toBe(0);
    expect(focusCoins(27 * m)).toBe(5);
    expect(focusCoins(600 * m)).toBe(REWARD.focusMax);
  });

  it("pays for a real break, not a skipped one", () => {
    const s = state();
    const t0 = Date.now();
    startRest(s, t0); endRest(s, t0 + 2 * m);
    expect(s.wallet.coins).toBe(0);
    startRest(s, t0 + 3 * m); endRest(s, t0 + 3 * m + REWARD.restMin);
    expect(s.wallet.coins).toBe(REWARD.rest);
  });

  it("pays for each new city level once", () => {
    const s = state();
    payLevels(s, 2);
    expect(s.wallet.coins).toBe(2 * REWARD.level);
    payLevels(s, 1); // fell back a level
    payLevels(s, 2); // and came back
    expect(s.wallet.coins).toBe(2 * REWARD.level);
  });

  it("writes every coin movement to the journal", () => {
    const g = goal(), s = state(g);
    markDone(s, g, g.tasks[0], true);
    s.wallet.coins = 500;
    buy(s, "statue");
    expect(s.log.filter(e => e.kind === "coins").map(e => "amount" in e && e.amount)).toEqual([REWARD.task, -400]);
  });
});

describe("shop", () => {
  it("buys when affordable, once for decorations", () => {
    const s = state();
    expect(buy(s, "benches")).toBe("poor");
    s.wallet.coins = 300;
    expect(buy(s, "benches")).toBe("ok");
    expect(buy(s, "benches")).toBe("owned");
    expect(s.wallet).toMatchObject({ coins: 180, owned: ["benches"] });
    expect(buy(s, "nope")).toBe("unknown");
  });

  it("freezes stack", () => {
    const s = state();
    s.wallet.coins = 1000;
    buy(s, "freeze"); buy(s, "freeze");
    expect(s.wallet.freezes).toBe(2);
    expect(s.wallet.owned).toEqual([]);
  });

  it("a bought roof goes on at once; only owned roofs can be chosen", () => {
    const s = state();
    s.wallet.coins = 1000;
    setRoof(s, "blue");
    expect(s.wallet.roof).toBeNull();
    buy(s, "roof-red");
    expect(s.wallet.roof).toBe("red");
    setRoof(s, null);
    expect(s.wallet.roof).toBeNull();
    setRoof(s, "red");
    expect(s.wallet.roof).toBe("red");
  });

  it("every item has a price and a unique id", () => {
    expect(new Set(SHOP.map(i => i.id)).size).toBe(SHOP.length);
    SHOP.forEach(i => expect(i.price).toBeGreaterThan(0));
  });
});

describe("streak freeze", () => {
  const missedOneDay = (): [AppState, Goal] => {
    const g: Goal = { ...goal("daily"), day: "2026-09-28", lastBuilt: "2026-09-27", streak: 5 }; // built on the 27th, missed the 28th
    return [state(g), g];
  };

  it("saves the streak after one missed day and is used up", () => {
    const [s, g] = missedOneDay();
    s.wallet.freezes = 1;
    rollDaily(s);
    expect(g.streak).toBe(5);
    expect(s.wallet.freezes).toBe(0);
    expect(s.log.at(-1)).toMatchObject({ kind: "freeze_used", goalId: g.id });
    [...g.tasks].forEach(t => markDone(s, g, t, true)); // and today continues it
    expect(g.streak).toBe(6);
  });

  it("without a freeze the streak breaks", () => {
    const [s, g] = missedOneDay();
    rollDaily(s);
    expect(g.streak).toBe(0);
  });

  it("does not cover two missed days", () => {
    const g: Goal = { ...goal("daily"), day: "2026-09-27", lastBuilt: "2026-09-26", streak: 5 };
    const s = state(g);
    s.wallet.freezes = 3;
    rollDaily(s);
    expect(g.streak).toBe(0);
    expect(s.wallet.freezes).toBe(3);
  });
});

describe("normalize wallet", () => {
  it("repairs broken or foreign data", () => {
    const s = state(goal());
    s.wallet = { coins: -5, freezes: 2.7, owned: ["statue", "freeze", "hack"], roof: "blue", levelPaid: NaN } as never;
    normalize(s);
    expect(s.wallet).toEqual({ coins: 0, freezes: 2, owned: ["statue"], roof: null, levelPaid: 0 });
    const old = { goals: [goal()], timers: [] } as unknown as AppState;
    normalize(old);
    expect(old.wallet).toEqual(freshWallet());
  });
});
