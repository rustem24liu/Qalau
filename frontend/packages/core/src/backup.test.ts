import { describe, expect, it } from "vitest";
import { BACKUP_VERSION, backupFileName, exportBackup, parseBackup } from "./backup";
import { exampleState } from "./goals";

describe("backup", () => {
  it("round-trips the whole state", () => {
    const s = exampleState();
    s.wallet.coins = 321;
    s.goals[0].title = "Мой проект";
    const back = parseBackup(exportBackup(s, 1234));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.exportedAt).toBe(1234);
    expect(back.state.wallet.coins).toBe(321);
    expect(back.state.goals[0].title).toBe("Мой проект");
    expect(back.state.example).toBeUndefined(); // a restored example is real data now
  });

  it("accepts a raw state and repairs old data", () => {
    const raw = JSON.stringify({ goals: [{ id: "g", type: "big", title: "Старое", tasks: [] }] });
    const back = parseBackup(raw);
    expect(back.ok && back.state.wallet.coins === 0 && Array.isArray(back.state.log)).toBe(true);
    expect(back.ok && back.exportedAt).toBeNull();
  });

  it.each([
    ["not json", "{oops"],
    ["no goals", JSON.stringify({ hello: 1 })],
    ["empty", "null"],
    ["newer app", JSON.stringify({ format: "qalau-backup", version: BACKUP_VERSION + 1, state: { goals: [] } })],
  ])("rejects %s with a message", (_, text) => {
    const back = parseBackup(text);
    expect(back.ok).toBe(false);
    expect(!back.ok && back.error.length).toBeGreaterThan(5);
  });

  it("names files by date", () => {
    expect(backupFileName(new Date(2026, 8, 5))).toBe("qalau-backup-2026-09-05.json");
  });
});
