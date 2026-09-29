import { logEvent } from "./log";
import { sizeOf } from "./constants";
import type { AppState, Task, TaskSize } from "./types";

export type RoofId = "red" | "green" | "blue" | "black";

export interface Wallet {
  coins: number;
  /** Streak freezes in stock. */
  freezes: number;
  /** Ids of bought decorations and roof colors. */
  owned: string[];
  /** Roof color in use, or null for the houses' own. */
  roof: RoofId | null;
  /** Highest city level already paid for, so re-reaching a level pays nothing. */
  levelPaid: number;
}

export const freshWallet = (): Wallet => ({ coins: 0, freezes: 0, owned: [], roof: null, levelPaid: 0 });

/** Coins for each kind of progress. */
export const REWARD = {
  /** A normal (M) task; see TASK_COINS for every size. */
  task: 10,
  hut: 20,
  /** Every 7 days of a daily streak. */
  streakWeek: 50,
  /** Per 5 minutes of a finished focus session, up to focusMax. */
  focus5: 1,
  focusMax: 12,
  /** A break of at least restMin. */
  rest: 5,
  restMin: 5 * 60_000,
  level: 50,
};

export function earn(s: AppState, amount: number, reason: string, now = Date.now()): void {
  if (amount <= 0) return;
  s.wallet.coins += amount;
  logEvent(s, { kind: "coins", amount, reason }, now);
}

/** Pays for a finished task once; unchecking and checking again pays nothing. Mutates. */
/** Coins for finishing a task, by its size. */
export const TASK_COINS: Record<TaskSize, number> = { S: 5, M: REWARD.task, L: 20 };

export function rewardTask(s: AppState, t: Task, now = Date.now()): void {
  if (t.rewarded) return;
  t.rewarded = true;
  earn(s, TASK_COINS[sizeOf(t)], "task", now);
}

export const focusCoins = (ms: number) => Math.min(REWARD.focusMax, Math.floor(ms / (5 * 60_000)) * REWARD.focus5);

/** Pays for every city level above the last one paid for. Mutates. */
export function payLevels(s: AppState, level: number, now = Date.now()): void {
  for (let l = s.wallet.levelPaid + 1; l <= level; l++) earn(s, REWARD.level, "level", now);
  s.wallet.levelPaid = Math.max(s.wallet.levelPaid, level);
}

export type ShopKind = "freeze" | "decor" | "roof";

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  desc: string;
  price: number;
}

export const SHOP: ShopItem[] = [
  { id: "freeze", kind: "freeze", name: "Заморозка серии", desc: "Спасёт серию ежедневной цели, если пропустите один день. Срабатывает сама.", price: 80 },
  { id: "benches", kind: "decor", name: "Скамейки", desc: "Скамейки по краям площади.", price: 120 },
  { id: "flowers", kind: "decor", name: "Клумбы", desc: "Цветочные клумбы в углах площади.", price: 160 },
  { id: "flags", kind: "decor", name: "Флаги", desc: "Флаги вокруг площади.", price: 220 },
  { id: "statue", kind: "decor", name: "Золотая статуя", desc: "Статуя строителя на постаменте.", price: 400 },
  { id: "roof-red", kind: "roof", name: "Красные крыши", desc: "Черепица цвета терракоты на всех домах.", price: 100 },
  { id: "roof-green", kind: "roof", name: "Зелёные крыши", desc: "Зелёная кровля на всех домах.", price: 100 },
  { id: "roof-blue", kind: "roof", name: "Синие крыши", desc: "Синяя кровля на всех домах.", price: 100 },
  { id: "roof-black", kind: "roof", name: "Графитовые крыши", desc: "Тёмная кровля на всех домах.", price: 140 },
];

export const roofOf = (itemId: string): RoofId | null => (itemId.startsWith("roof-") ? (itemId.slice(5) as RoofId) : null);

export type BuyResult = "ok" | "poor" | "owned" | "unknown";

/** Buys an item: freezes stack, everything else is bought once; a roof is put on right away. Mutates. */
export function buy(s: AppState, id: string, now = Date.now()): BuyResult {
  const item = SHOP.find(i => i.id === id);
  if (!item) return "unknown";
  if (item.kind !== "freeze" && s.wallet.owned.includes(id)) return "owned";
  if (s.wallet.coins < item.price) return "poor";
  s.wallet.coins -= item.price;
  logEvent(s, { kind: "coins", amount: -item.price, reason: "buy:" + id }, now);
  if (item.kind === "freeze") s.wallet.freezes++;
  else s.wallet.owned.push(id);
  if (item.kind === "roof") s.wallet.roof = roofOf(id);
  return "ok";
}

/** Switches to an owned roof color, or back to the default (null). Mutates. */
export function setRoof(s: AppState, roof: RoofId | null): void {
  if (roof === null || s.wallet.owned.includes("roof-" + roof)) s.wallet.roof = roof;
}

/** Repairs a saved wallet. Mutates. */
export function normalizeWallet(s: AppState): void {
  const w = s.wallet;
  if (!w || typeof w !== "object") { s.wallet = freshWallet(); return; }
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  w.coins = num(w.coins);
  w.freezes = num(w.freezes);
  w.levelPaid = num(w.levelPaid);
  w.owned = Array.isArray(w.owned) ? w.owned.filter(id => SHOP.some(i => i.id === id && i.kind !== "freeze")) : [];
  if (w.roof && !w.owned.includes("roof-" + w.roof)) w.roof = null;
  if (w.roof === undefined) w.roof = null;
}
