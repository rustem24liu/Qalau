import { GOAL_TYPES, STAGES } from "@qalau/core";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildHouse } from "./house";
import { houseConfigs } from "./houseConfig";
import { createBlueprintMaterial, createMaterials } from "./materials";
import { createPrimitives } from "./primitives";

const mat = createMaterials();
const build = (type: (typeof GOAL_TYPES)[number]) =>
  buildHouse(new THREE.Group(), houseConfigs(mat)[type], mat, createBlueprintMaterial(), createPrimitives());

describe.each(GOAL_TYPES)("%s house", type => {
  const h = build(type);

  it("builds pieces in stage order, so progress fills the stages one by one", () => {
    const stages = h.pieces.map(p => p.stage);
    expect(stages).toEqual([...stages].sort((a, b) => a - b));
    expect(h.stageSet[0]).toBe(0);
    expect(h.stageSet.at(-1)).toBe(STAGES.length - 1);
  });

  it("starts empty and hidden", () => {
    expect(h.N).toBe(h.pieces.length);
    expect(h.pieces.every(p => !p.obj.visible && !p.on)).toBe(true);
  });

  it("places the bed on the island, right of the house, with room to walk around the house", () => {
    const { foot } = h.bed;
    expect(foot.x).toBeGreaterThan(h.dims.hx + 1.5);
    expect(Math.abs(foot.x) + 1.3).toBeLessThan(h.dims.IX);
    expect(h.bed.top).toBeGreaterThan(0.3);
  });

  it("keeps the door and the builder's idle spot on the island", () => {
    expect(h.doorPiece.stage).toBe(2);
    expect(Math.abs(h.idle.x)).toBeLessThan(h.dims.IX);
    expect(Math.abs(h.idle.z)).toBeLessThan(h.dims.IZ);
  });
});

it("bigger goals get bigger buildings", () => {
  expect(build("big").N).toBeGreaterThan(build("medium").N);
  expect(build("medium").N).toBeGreaterThan(build("daily").N);
});

describe("roof themes", () => {
  it("recolors roofs and restores them", async () => {
    const { applyRoofTheme } = await import("./materials");
    const m = createMaterials(), before = m.teal.color.getHex();
    applyRoofTheme(m, "red");
    expect(m.teal.color.getHex()).not.toBe(before);
    applyRoofTheme(m, null);
    expect(m.teal.color.getHex()).toBe(before);
  });
});
