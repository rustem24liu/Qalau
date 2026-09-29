import type { Landmark } from "@qalau/core";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CELL, CityScene, citySize, cityRings, lotPositions, type CityLot } from "./city";
import { houseConfigs } from "./houseConfig";
import { buildLandmark } from "./landmarks";
import { createBlueprintMaterial, createMaterials } from "./materials";
import { createPrimitives } from "./primitives";

const mat = createMaterials();
const prim = createPrimitives();

describe("lotPositions", () => {
  it.each([1, 16, 17, 40, 100])("gives %i distinct lots off the plaza and on the ground", n => {
    const lots = lotPositions(n);
    expect(lots).toHaveLength(n);
    expect(new Set(lots.map(p => p.x + "," + p.z)).size).toBe(n);
    const half = citySize(cityRings(n)) / 2;
    lots.forEach(({ x, z }) => {
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeGreaterThanOrEqual(2 * CELL); // outside the 3×3 plaza
      expect(Math.max(Math.abs(x), Math.abs(z)) + CELL / 2).toBeLessThanOrEqual(half);
    });
  });

  it("puts the first house on the side facing the camera", () => {
    const [first] = lotPositions(1);
    expect(first.x).toBeGreaterThan(0);
    expect(first.z).toBeGreaterThan(0);
  });

  it("keeps existing lots in place when goals are added", () => {
    expect(lotPositions(10)).toEqual(lotPositions(12).slice(0, 10));
  });

  it("grows the city by a ring when the lots run out", () => {
    expect(cityRings(16)).toBe(2);
    expect(cityRings(17)).toBe(3);
  });
});

describe("landmarks", () => {
  const kinds: Landmark[] = ["baiterek", "koktobe", "townhall"];

  it.each(kinds)("%s grows from the ground up and fits the plaza", kind => {
    const lm = buildLandmark(kind, mat, prim);
    expect(lm.pieces.length).toBeGreaterThan(20);
    const box = new THREE.Box3();
    const bottoms = lm.pieces.map(p => box.setFromObject(p).min.y);
    // allow the crowning piece to break the order on purpose (the golden ball goes last)
    const sorted = bottoms.slice(0, -1).every((y, i, a) => i === 0 || y >= a[i - 1] - 0.3);
    expect(sorted).toBe(true);
    const all = new THREE.Box3().setFromObject(lm.grp);
    expect(all.max.x - all.min.x).toBeLessThan(3 * CELL - 2);
    expect(all.max.z - all.min.z).toBeLessThan(3 * CELL - 2);
  });

  it("Baiterek is crowned by the golden ball", () => {
    const lm = buildLandmark("baiterek", mat, prim);
    const last = lm.pieces.at(-1)!.children[0] as THREE.Mesh;
    expect(last.material).toBe(mat.gold);
  });
});

describe("CityScene", () => {
  const make = () => new CityScene(new THREE.Group(), mat, createBlueprintMaterial(), prim, houseConfigs(mat));
  const lot = (id: string, k = 0, type: CityLot["type"] = "big"): CityLot => ({ id, type, k });
  const houses = (c: CityScene) => c.group.children.filter(o => o.scale.x < 1).length;

  it("adds, rebuilds and removes houses as goals change", () => {
    const c = make();
    c.update({ landmark: "townhall", progress: 0, lots: [lot("a"), lot("b")] });
    expect(houses(c)).toBe(2);
    c.update({ landmark: "townhall", progress: 0, lots: [lot("a", 0, "daily")] });
    expect(houses(c)).toBe(1);
  });

  it("shows built pieces of each house and of the landmark", () => {
    const c = make();
    c.update({ landmark: "baiterek", progress: 0.5, lots: [lot("a", 10)] });
    const lm = buildLandmark("baiterek", mat, prim);
    const landmark = c.group.children.find(o => o.children.length === lm.pieces.length)!;
    const shown = landmark.children.filter(o => o.visible).length;
    expect(shown).toBe(Math.floor(lm.pieces.length / 2));
  });

  it("an empty city still shows the landmark's base", () => {
    const c = make();
    c.update({ landmark: "koktobe", progress: 0, lots: [] });
    const n = buildLandmark("koktobe", mat, prim).pieces.length;
    const lm = c.group.children.find(o => o.children.length === n)!;
    expect(lm.children.filter(o => o.visible)).toHaveLength(1);
  });

  it("grows the ground with the number of houses", () => {
    const c = make();
    c.update({ landmark: "townhall", progress: 0, lots: [lot("a")] });
    const small = c.size;
    c.update({ landmark: "townhall", progress: 0, lots: Array.from({ length: 20 }, (_, i) => lot("g" + i)) });
    expect(c.size).toBeGreaterThan(small);
  });
});
