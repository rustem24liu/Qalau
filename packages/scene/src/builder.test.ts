import { GOAL_TYPES } from "@qalau/core";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { Builder, type BuilderFrame } from "./builder";
import { buildHouse, type House } from "./house";
import { houseConfigs } from "./houseConfig";
import { createBlueprintMaterial, createMaterials } from "./materials";
import { createPrimitives } from "./primitives";

const mat = createMaterials();
const prim = createPrimitives();
const FRAME = 16; // ms, ~60 fps

const frame = (o: Partial<BuilderFrame> = {}): BuilderFrame =>
  ({ working: true, nextIdx: 0, offset: 0, main: true, busy: false, finale: false, ...o });

const insideWalls = (h: House, b: Builder) =>
  Math.abs(b.group.position.x) < h.dims.hx && Math.abs(b.group.position.z) < h.dims.hz;

/** Runs the builder for `ms`; returns false if he ever stepped inside the walls. */
function walk(h: House, b: Builder, f: BuilderFrame, ms: number, t0 = 0): boolean {
  for (let t = t0 + FRAME; t <= t0 + ms; t += FRAME) {
    b.update(t, h, f);
    if (insideWalls(h, b)) return false;
  }
  return true;
}

describe.each(GOAL_TYPES)("builder on the %s house", type => {
  const h = buildHouse(new THREE.Group(), houseConfigs(mat)[type], mat, createBlueprintMaterial(), prim);

  it("reaches every piece without walking through walls", () => {
    for (let i = 0; i < h.N; i += 2) {
      const b = new Builder(mat, prim);
      b.placeAt(h);
      const f = frame({ nextIdx: i });
      expect(walk(h, b, f, 15_000), `piece ${i}: went inside`).toBe(true);
      const at = b.group.position.clone();
      b.update(15_000 + FRAME, h, f);
      expect(Math.hypot(at.x - b.group.position.x, at.z - b.group.position.z), `piece ${i}: still walking`).toBeLessThan(0.01);
    }
  });

  it("goes around the house to the far side instead of getting stuck at a corner", () => {
    const b = new Builder(mat, prim);
    b.placeAt(h);
    // the piece farthest from the idle spot
    const far = h.pieces.reduce((best, p, i) => {
      const q = p.obj.children[0].position, d = Math.hypot(q.x - h.idle.x, q.z - h.idle.z);
      return d > best.d ? { i, d } : best;
    }, { i: 0, d: 0 }).i;
    expect(walk(h, b, frame({ nextIdx: far }), 15_000)).toBe(true);
    const q = h.pieces[far].obj.children[0].position;
    expect(Math.hypot(q.x - b.group.position.x, q.z - b.group.position.z)).toBeLessThan(2.5);
  });

  it("walks back to the idle spot when work stops", () => {
    const b = new Builder(mat, prim);
    b.placeAt(h);
    walk(h, b, frame({ nextIdx: Math.floor(h.N / 2) }), 10_000);
    expect(walk(h, b, frame({ working: false }), 15_000, 10_000)).toBe(true);
    expect(Math.hypot(b.group.position.x - h.idle.x, b.group.position.z - h.idle.z)).toBeLessThan(0.1);
  });
});

describe("moods", () => {
  const h = buildHouse(new THREE.Group(), houseConfigs(mat).daily, mat, createBlueprintMaterial(), prim);

  it("walks to the bed and lies down on a break, then gets up and walks back", () => {
    const b = new Builder(mat, prim);
    b.placeAt(h);
    b.mood = "rest";
    expect(walk(h, b, frame({ working: false }), 8000)).toBe(true);
    expect(b.group.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(b.group.position.y).toBeCloseTo(h.bed.top + 0.2, 1);
    // head ends up on the pillow side of the bed
    const head = b.group.localToWorld(new THREE.Vector3(0, 1.2, 0));
    expect(head.z).toBeLessThan(h.bed.foot.z - 1);

    b.mood = "normal";
    expect(walk(h, b, frame({ working: false }), 8000, 8000)).toBe(true);
    expect(b.group.rotation.x).toBeCloseTo(0);
    expect(Math.hypot(b.group.position.x - h.idle.x, b.group.position.z - h.idle.z)).toBeLessThan(0.1);
  });

  it("gets up from bed before walking to work", () => {
    const b = new Builder(mat, prim);
    b.placeAt(h);
    b.mood = "rest";
    walk(h, b, frame({ working: false }), 8000);
    b.mood = "normal";
    const bedPos = b.group.position.clone();
    b.update(8000 + FRAME, h, frame({ nextIdx: 0 }));
    expect(b.group.position.x).toBe(bedPos.x); // still standing up, not sliding along the ground
  });

  it("keeps animating in any mood other than normal", () => {
    const b = new Builder(mat, prim);
    b.placeAt(h);
    walk(h, b, frame({ working: false }), 3000);
    expect(b.update(3100, h, frame({ working: false }))).toBe(false);
    b.mood = "cheer";
    expect(b.update(3200, h, frame({ working: false }))).toBe(true);
  });

  it("only the main builder presses the console", () => {
    const extra = new Builder(mat, prim);
    extra.placeAt(h);
    const before = mat.conBtn.emissiveIntensity;
    extra.update(170 * Math.PI / 2, h, frame({ working: false, busy: true, main: false }));
    expect(mat.conBtn.emissiveIntensity).toBe(before);
  });
});
