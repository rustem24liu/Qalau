import type { GoalType, Landmark } from "@qalau/core";
import * as THREE from "three";
import { buildHouse, type House } from "./house";
import type { HouseConfig } from "./houseConfig";
import { buildLandmark, type LandmarkModel } from "./landmarks";
import type { Materials } from "./materials";
import type { Primitives } from "./primitives";

export interface CityLot {
  /** Goal id. */
  id: string;
  type: GoalType;
  /** Pieces built. */
  k: number;
}

export interface CityView {
  landmark: Landmark;
  /** 0..1 of the landmark built. */
  progress: number;
  lots: CityLot[];
}

/** Lot size in world units; the landmark plaza takes the middle 3×3 lots. */
export const CELL = 10;
const LOT_SCALE = 0.65;
const MIN_RINGS = 2;

/** Rings of lots around the plaza needed for n houses. */
export function cityRings(n: number): number {
  let r = MIN_RINGS;
  while ((2 * r + 1) ** 2 - 9 < n) r++;
  return r;
}

/**
 * Lot centers for n houses: ring by ring outward from the plaza, each ring
 * starting from the corner that faces the camera, so the first houses are in view.
 */
export function lotPositions(n: number): { x: number; z: number }[] {
  const r = cityRings(n), cells: { x: number; z: number; ring: number; ang: number }[] = [];
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      const ring = Math.max(Math.abs(i), Math.abs(j));
      if (ring < 2) continue;
      // angle away from the camera direction (+x, +z)
      const ang = Math.abs(Math.atan2(j - i, i + j));
      cells.push({ x: i * CELL, z: j * CELL, ring, ang });
    }
  }
  return cells.sort((a, b) => a.ring - b.ring || a.ang - b.ang || a.x - b.x).slice(0, n).map(({ x, z }) => ({ x, z }));
}

/** Ground size (side of the square) for a city of r rings. */
export const citySize = (r: number) => (2 * r + 1) * CELL + 3;

/** The user's city: ground, roads, the landmark on its plaza, and a house for every goal. */
export class CityScene {
  readonly group = new THREE.Group();
  private ground: THREE.Group | null = null;
  private groundKey = "";
  private rings = MIN_RINGS;
  /** Extra ground behind the city (Almaty's foothills). */
  private back = 0;
  private landmarks = new Map<Landmark, LandmarkModel>();
  private lots = new Map<string, { type: GoalType; house: House }>();

  constructor(
    parent: THREE.Object3D,
    private mat: Materials,
    private bpMat: THREE.LineBasicMaterial,
    private prim: Primitives,
    private cfg: Record<GoalType, HouseConfig>,
  ) {
    this.group.visible = false;
    parent.add(this.group);
  }

  /** Largest side of the city ground, for camera fit and shadows. */
  get size(): number {
    return citySize(this.rings) + this.back;
  }

  update(view: CityView): void {
    this.rings = cityRings(view.lots.length);
    this.buildGround(view.landmark);
    this.showLandmark(view.landmark, view.progress);

    const pos = lotPositions(view.lots.length);
    const keep = new Set(view.lots.map(l => l.id));
    for (const [id, lot] of this.lots) if (!keep.has(id)) { this.group.remove(lot.house.grp); this.lots.delete(id); }
    view.lots.forEach((l, i) => {
      let lot = this.lots.get(l.id);
      if (!lot || lot.type !== l.type) {
        if (lot) this.group.remove(lot.house.grp);
        const house = buildHouse(this.group, this.cfg[l.type], this.mat, this.bpMat, this.prim, { lot: true });
        house.grp.scale.setScalar(LOT_SCALE);
        house.grp.visible = true;
        lot = { type: l.type, house };
        this.lots.set(l.id, lot);
      }
      lot.house.grp.position.set(pos[i].x, 0, pos[i].z);
      lot.house.pieces.forEach((p, j) => { p.obj.visible = j < l.k; p.obj.position.y = 0; });
    });
  }

  private showLandmark(kind: Landmark, progress: number) {
    let lm = this.landmarks.get(kind);
    if (!lm) {
      lm = buildLandmark(kind, this.mat, this.prim);
      this.landmarks.set(kind, lm);
      this.group.add(lm.grp);
    }
    this.landmarks.forEach((m, k) => { m.grp.visible = k === kind; });
    // the base is always there, so an empty plaza still shows where the landmark will rise
    const k = Math.max(1, Math.floor(progress * lm.pieces.length));
    lm.pieces.forEach((p, i) => { p.visible = i < k; });
  }

  private buildGround(kind: Landmark) {
    const key = this.rings + "|" + kind;
    if (key === this.groundKey) return;
    if (this.ground) this.group.remove(this.ground);
    this.groundKey = key;
    const { box } = this.prim, m = this.mat, g = new THREE.Group(), S = citySize(this.rings), h = S / 2, r = this.rings;
    // floating island, like the building site; Almaty gets a strip of foothills behind the city
    const back = (this.back = kind === "koktobe" ? 12 : 0), D = S + back, cz = -back / 2;
    g.add(box(S, 0.34, D, m.grass, 0, -0.17, cz));
    g.add(box(S - 0.6, 1.6, D - 0.6, m.dirt, 0, -1.14, cz));
    g.add(box(S - 3, 1.2, D - 3, m.dirt2, 0, -2.5, cz));
    g.add(box(S - 8, 0.9, D - 8, m.dirt2, 0, -3.5, cz));
    // roads along lot edges, and the plaza
    for (let i = -r; i <= r + 1; i++) {
      const c = (i - 0.5) * CELL;
      g.add(box(1.3, 0.04, S - 1, m.road, c, 0.02, 0));
      g.add(box(S - 1, 0.04, 1.3, m.road, 0, 0.021, c));
    }
    g.add(box(3 * CELL - 1.3, 0.06, 3 * CELL - 1.3, m.paving, 0, 0.03, 0));
    // Almaty sits under the mountains
    if (kind === "koktobe") {
      const peaks: [number, number, number][] = [[-0.36, 9, 5.5], [-0.12, 13, 6.5], [0.12, 10, 6], [0.36, 8, 5]];
      peaks.forEach(([t, ht, rad]) => {
        const x = t * S, z = -h - back / 2;
        const rock = new THREE.Mesh(new THREE.ConeGeometry(rad, ht, 6), m.rock);
        rock.position.set(x, ht / 2 - 0.2, z);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.38, ht * 0.38, 6), m.snow);
        cap.position.set(x, ht - (ht * 0.38) / 2 - 0.1, z);
        [rock, cap].forEach(o => { o.castShadow = true; g.add(o); });
      });
    }
    this.ground = g;
    this.group.add(g);
  }
}
