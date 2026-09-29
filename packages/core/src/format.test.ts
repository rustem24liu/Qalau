import { describe, expect, it } from "vitest";
import { fmtClock, fmtDur, pad } from "./format";

const s = 1000, m = 60 * s, h = 60 * m;

describe("pad", () => {
  it("pads to two digits", () => {
    expect(pad(3)).toBe("03");
    expect(pad(12)).toBe("12");
  });
});

describe("fmtClock", () => {
  it("formats minutes and seconds", () => {
    expect(fmtClock(0)).toBe("00:00");
    expect(fmtClock(25 * m)).toBe("25:00");
    expect(fmtClock(3 * m + 7 * s)).toBe("03:07");
  });

  it("rounds partial seconds up, so a countdown never shows 00:00 early", () => {
    expect(fmtClock(59_100)).toBe("01:00");
    expect(fmtClock(1)).toBe("00:01");
  });

  it("adds hours when needed", () => {
    expect(fmtClock(h + 2 * m + 3 * s)).toBe("1:02:03");
  });

  it("clamps negative time to zero", () => {
    expect(fmtClock(-5 * s)).toBe("00:00");
  });
});

describe("fmtDur", () => {
  it("shows seconds under a minute", () => {
    expect(fmtDur(40 * s)).toBe("40 с");
    expect(fmtDur(0)).toBe("0 с");
  });

  it("shows seconds only for short durations under 10 min", () => {
    expect(fmtDur(3 * m + 20 * s)).toBe("3 мин 20 с");
    expect(fmtDur(3 * m)).toBe("3 мин");
    expect(fmtDur(12 * m + 20 * s)).toBe("12 мин");
  });

  it("shows hours and minutes", () => {
    expect(fmtDur(h + 5 * m)).toBe("1 ч 5 мин");
    expect(fmtDur(2 * h)).toBe("2 ч 0 мин");
  });
});
