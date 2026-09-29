import { describe, expect, it } from "vitest";
import { dayPhase, fromWmo, isDayPhase, isWeatherKind } from "./weather";

describe("fromWmo", () => {
  it.each([
    [0, "clear"], [2, "clouds"], [3, "overcast"], [45, "fog"], [53, "drizzle"],
    [61, "rain"], [65, "rain"], [73, "snow"], [95, "storm"], [99, "storm"], [42, "clouds"],
  ])("code %i is %s", (code, kind) => {
    expect(fromWmo(code).kind).toBe(kind);
  });

  it("heavier codes mean higher intensity", () => {
    expect(fromWmo(61).intensity).toBeLessThan(fromWmo(63).intensity);
    expect(fromWmo(63).intensity).toBeLessThan(fromWmo(65).intensity);
  });
});

describe("dayPhase", () => {
  const MIN = 60_000, rise = 6 * 60 * MIN, set = 19 * 60 * MIN;
  const at = (min: number) => dayPhase({ sunrise: rise, sunset: set, isDay: true }, min * MIN);

  it("follows sunrise and sunset", () => {
    expect(at(5 * 60)).toBe("night");
    expect(at(5 * 60 + 45)).toBe("morning");
    expect(at(6 * 60 + 59)).toBe("morning");
    expect(at(12 * 60)).toBe("day");
    expect(at(18 * 60 + 30)).toBe("evening");
    expect(at(19 * 60 + 40)).toBe("evening");
    expect(at(20 * 60)).toBe("night");
  });

  it("falls back to isDay in polar day / night", () => {
    expect(dayPhase({ sunrise: null, sunset: null, isDay: true })).toBe("day");
    expect(dayPhase({ sunrise: null, sunset: null, isDay: false })).toBe("night");
  });
});

describe("guards", () => {
  it("accept only known values", () => {
    expect(isWeatherKind("rain")).toBe(true);
    expect(isWeatherKind("hail")).toBe(false);
    expect(isDayPhase("night")).toBe(true);
    expect(isDayPhase(3)).toBe(false);
  });
});
