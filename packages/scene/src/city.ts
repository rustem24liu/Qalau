import type { GoalType, Landmark } from "@qalau/core";
import * as THREE from "three";
import { buildHouse, setNeglect, type House } from "./house";
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
  /** 0 tidy, 1 overgrown, 2 abandoned. */
  neglect?: number;
}

export interface CityView {
  landmark: Landmark;
  /** 0..1 of the landmark built. */
  progress: number;
  lots: CityLot[];
  /** City level (index into CITY_LEVELS): 1 lamps, 2 park, 3 fountain, 4 skyscrapers. */
  level: number;
  /** Bought plaza decorations: "benches" | "flowers" | "flags" | "statue". */
  decor?: string[];
}

/** Level at which each kind of decoration appears. */
export const PERK_LEVEL = { lamps: 1, park: 2, fountain: 3, towers: 4 } as const;

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
  private decor: THREE.Group | null = null;
  private decorKey = "";
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
    this.buildDecor(view.level, view.lots.length, view.decor ?? []);

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
      setNeglect(lot.house, l.neglect ?? 0);
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

  /** Level perks: street lamps, a park on free lots, a fountain, skyscrapers on the outskirts. */
  private buildDecor(level: number, used: number, bought: string[]) {
    const key = [level, used, this.rings, ...bought].join("|");
    if (key === this.decorKey) return;
    if (this.decor) this.group.remove(this.decor);
    this.decorKey = key;
    const { box, blob } = this.prim, m = this.mat, g = new THREE.Group(), r = this.rings;
    const plaza = 1.5 * CELL;

    if (level >= PERK_LEVEL.lamps) {
      for (let i = -r; i <= r + 1; i++) {
        for (let j = -r; j <= r + 1; j++) {
          const x = (i - 0.5) * CELL + 1, z = (j - 0.5) * CELL + 1; // on the corner, beside the crossing
          if (Math.abs(x) < plaza && Math.abs(z) < plaza) continue;
          g.add(box(0.16, 2.2, 0.16, m.ridge, x, 1.1, z), box(0.4, 0.4, 0.4, m.lamp, x, 2.35, z));
        }
      }
    }
    const free = lotPositions((2 * r + 1) ** 2 - 9).slice(used);
    free.forEach(({ x, z }) => {
      // outer ring, on the far side from the camera, so towers never hide the houses
      const outskirts = Math.max(Math.abs(x), Math.abs(z)) === r * CELL && x + z < 0;
      if (level >= PERK_LEVEL.towers && outskirts) {
        // a glass tower, height varied by position
        const h = 8 + (Math.abs(x * 7 + z * 13) % 9);
        g.add(box(5, h, 5, m.tower, x, h / 2, z), box(5.3, 0.4, 5.3, m.tower2, x, h * 0.5, z), box(5.3, 0.4, 5.3, m.tower2, x, h, z));
      } else if (level >= PERK_LEVEL.park) {
        ([[-2, -1.5, 1.3], [2.2, 1, 1.1], [-0.5, 2.6, 0.9], [1.4, -2.4, 1]] as const).forEach(([dx, dz, s]) =>
          g.add(box(0.3, 1.2 * s, 0.3, m.trunk, x + dx, 0.6 * s, z + dz), blob(1.1 * s, m.leaf, x + dx, 1.7 * s, z + dz)));
        g.add(box(3.6, 0.03, 0.7, m.stone, x, 0.02, z)); // a path through the park
      }
    });
    if (level >= PERK_LEVEL.fountain) {
      const fx = CELL * 1.05, fz = CELL * 1.05; // plaza corner facing the camera
      const cyl = (rt: number, rb: number, h: number, mm: THREE.Material, y: number) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), mm);
        c.position.set(fx, y + h / 2, fz);
        c.castShadow = c.receiveShadow = true;
        return c;
      };
      g.add(cyl(2.4, 2.6, 0.6, m.stone, 0), cyl(2.1, 2.1, 0.08, m.water, 0.5), cyl(0.3, 0.4, 1.6, m.stone, 0.5),
        cyl(1.0, 0.5, 0.35, m.stone, 2.1), cyl(0.85, 0.85, 0.06, m.water, 2.4), cyl(0.12, 0.12, 0.9, m.water, 2.4));
    }
    this.addBought(g, bought);
    this.decor = g;
    this.group.add(g);
  }

  /** Decorations bought in the shop, placed on and around the plaza. */
  private addBought(g: THREE.Group, bought: string[]) {
    const { box } = this.prim, m = this.mat, edge = 1.5 * CELL - 1.6;
    if (bought.includes("benches")) {
      // one bench on each side of the plaza, facing the landmark (a bench faces local +z)
      ([[5, edge, Math.PI], [-5, -edge, 0], [edge, -5, -Math.PI / 2], [-edge, 5, Math.PI / 2]] as const).forEach(([x, z, rot]) => {
        const b = new THREE.Group();
        b.add(box(2.4, 0.14, 0.6, m.wood, 0, 0.55, 0), box(2.4, 0.6, 0.12, m.wood2, 0, 0.9, -0.3));
        [-1, 1].forEach(sd => b.add(box(0.12, 0.55, 0.5, m.ridge, sd * 1.05, 0.28, 0)));
        b.position.set(x, 0, z);
        b.rotation.y = rot;
        g.add(b);
      });
    }
    if (bought.includes("flowers")) {
      ([[-1, -1], [1, -1], [-1, 1]] as const).forEach(([sx, sz]) => {
        const x = sx * (edge - 0.6), z = sz * (edge - 0.6);
        g.add(box(3, 0.35, 3, m.stone, x, 0.18, z), box(2.6, 0.12, 2.6, m.dirt, x, 0.38, z));
        for (let i = 0; i < 9; i++) g.add(box(0.4, 0.4, 0.4, [m.fl1, m.fl2, m.fl3][i % 3], x - 0.8 + (i % 3) * 0.8, 0.6, z - 0.8 + Math.floor(i / 3) * 0.8));
      });
    }
    if (bought.includes("flags")) {
      const spots = [-1, 0, 1].flatMap(a => [[a * edge, edge + 0.9], [a * edge, -edge - 0.9], [edge + 0.9, a * edge], [-edge - 0.9, a * edge]]);
      spots.forEach(([x, z], i) => g.add(box(0.12, 4, 0.12, m.ridge, x, 2, z), box(1.2, 0.7, 0.05, [m.flag, m.brick, m.teal2][i % 3], x + 0.62, 3.5, z)));
    }
    if (bought.includes("statue")) {
      const x = -CELL * 1.05, z = CELL * 1.05, s = 2.2; // plaza corner facing the camera, opposite the fountain
      g.add(box(2.4, 1.2, 2.4, m.stone, x, 0.6, z), box(2, 0.2, 2, m.white, x, 1.3, z));
      g.add(box(0.44 * s, 0.9 * s, 0.3 * s, m.gold, x, 1.4 + 0.45 * s, z), box(0.32 * s, 0.32 * s, 0.32 * s, m.gold, x, 1.4 + 1.08 * s, z),
        box(0.46 * s, 0.1 * s, 0.46 * s, m.gold, x, 1.4 + 1.27 * s, z), box(0.12 * s, 0.6 * s, 0.12 * s, m.gold, x + 0.3 * s, 1.4 + 1.2 * s, z));
    }
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
