import type { Landmark } from "@qalau/core";
import * as THREE from "three";
import type { Materials } from "./materials";
import type { Primitives } from "./primitives";

/** A city's signature building, grown piece by piece from the ground up. */
export interface LandmarkModel {
  grp: THREE.Group;
  /** In build order: lowest first. */
  pieces: THREE.Object3D[];
  height: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Collects pieces with a sort key (usually their bottom height) and returns them in build order. */
function assembler(grp: THREE.Group) {
  const list: { obj: THREE.Object3D; key: number }[] = [];
  const add = (key: number, ...objs: THREE.Object3D[]) => {
    const g = new THREE.Group();
    objs.forEach(o => g.add(o));
    grp.add(g);
    list.push({ obj: g, key });
    return g;
  };
  const done = () => list.map((p, i) => ({ ...p, i })).sort((a, b) => a.key - b.key || a.i - b.i).map(p => p.obj);
  return { add, done };
}

const shade = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

/** A square beam from a to b. */
function strut(a: THREE.Vector3, b: THREE.Vector3, w: number, m: THREE.Material) {
  const d = new THREE.Vector3().subVectors(b, a);
  const mesh = shade(new THREE.Mesh(new THREE.BoxGeometry(w, d.length() + w * 0.6, w), m));
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  return mesh;
}

const cylinder = (rTop: number, rBot: number, h: number, m: THREE.Material, y: number, seg = 16) => {
  const mesh = shade(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), m));
  mesh.position.y = y + h / 2;
  return mesh;
};

/** Astana: white trunk of beams flaring into a crown that cups a golden sphere. */
function baiterek(mat: Materials, { box }: Primitives): LandmarkModel {
  const grp = new THREE.Group();
  const { add, done } = assembler(grp);
  [[9, 0], [7, 0.5], [5, 1]].forEach(([s, y]) => add(y, box(s, 0.5, s, mat.stone, 0, y + 0.25, 0)));

  const base = 1.5, top = 18, N = 8, L = 15;
  // trunk radius along the height: slim column, then a crown opening around the sphere and closing over it
  const r = (y: number) => y < 10 ? 0.9 - 0.02 * (y - base) : y < 14.3 ? 0.73 + (1.6 * (y - 10)) / 4.3 : 2.33 - (1.0 * (y - 14.3)) / (top - 14.3);
  for (let i = 0; i < L; i++) {
    const y0 = base + ((top - base) * i) / L, y1 = base + ((top - base) * (i + 1)) / L;
    for (let c = 0; c < N; c++) {
      const a0 = (c / N) * Math.PI * 2 + y0 * 0.04, a1 = (c / N) * Math.PI * 2 + y1 * 0.04;
      const p0 = new THREE.Vector3(Math.cos(a0) * r(y0), y0, Math.sin(a0) * r(y0));
      const p1 = new THREE.Vector3(Math.cos(a1) * r(y1), y1, Math.sin(a1) * r(y1));
      add(y0 + c * 0.001, strut(p0, p1, 0.3, mat.white));
    }
  }
  const sphere = shade(new THREE.Mesh(new THREE.SphereGeometry(2.0, 24, 16), mat.gold));
  sphere.position.y = 15.4;
  add(1e3, sphere); // the golden ball crowns the build
  return { grp, pieces: done(), height: top };
}

/** Almaty: the Kok-Tobe TV tower — tripod legs, tapering tube, two pods and an antenna. */
function koktobe(mat: Materials, { box }: Primitives): LandmarkModel {
  const grp = new THREE.Group();
  const { add, done } = assembler(grp);
  add(0, cylinder(3.6, 3.8, 0.4, mat.stone, 0, 24));
  const hub = new THREE.Vector3(0, 5, 0);
  for (let l = 0; l < 3; l++) {
    const a = (l / 3) * Math.PI * 2 + Math.PI / 6;
    const foot = new THREE.Vector3(Math.cos(a) * 3, 0.4, Math.sin(a) * 3);
    for (let s = 0; s < 4; s++) {
      const p0 = foot.clone().lerp(hub, s / 4), p1 = foot.clone().lerp(hub, (s + 1) / 4);
      add(p0.y + l * 0.001, strut(p0, p1, 0.4, mat.steel2));
    }
  }
  const t0 = 5, t1 = 19, n = 14;
  for (let i = 0; i < n; i++) {
    const y = t0 + ((t1 - t0) * i) / n, h = (t1 - t0) / n;
    const rb = 0.85 - (0.5 * i) / n, rt = 0.85 - (0.5 * (i + 1)) / n;
    add(y, cylinder(rt, rb, h, i % 2 ? mat.steel2 : mat.white, y));
  }
  // observation pods
  add(10.6, cylinder(1.9, 1.5, 0.9, mat.white, 10.6), cylinder(1.95, 1.95, 0.3, mat.glass, 10.9));
  add(14.8, cylinder(1.3, 1.1, 0.6, mat.white, 14.8));
  for (let i = 0; i < 3; i++) add(19 + i * 1.3, box(0.14, 1.3, 0.14, mat.steel2, 0, 19.65 + i * 1.3, 0));
  add(23, box(0.3, 0.3, 0.3, mat.lamp, 0, 23.1, 0));
  return { grp, pieces: done(), height: 23.3 };
}

/** Any other city: a two-storey town hall with a portico and a clock tower. */
function townhall(mat: Materials, { box }: Primitives): LandmarkModel {
  const grp = new THREE.Group();
  const { add, done } = assembler(grp);
  const W = 12, D = 7, fh = 2.2, y0 = 0.6;
  add(0, box(W + 2, 0.6, D + 2, mat.stone, 0, 0.3, 0));
  for (let f = 0; f < 2; f++) {
    const y = y0 + f * fh;
    for (let x = -W / 2 + 1; x < W / 2; x += 2) {
      [1, -1].forEach(s => add(y + (s + 1) * 0.001, box(2, fh, 0.5, mat.plaster, x, y + fh / 2, (s * (D - 0.5)) / 2),
        box(0.9, 1.1, 0.56, mat.glass, x, y + fh / 2 + 0.1, (s * (D - 0.5)) / 2)));
    }
    for (let z = -D / 2 + 1.5; z < D / 2 - 0.5; z += 2) {
      [1, -1].forEach(s => add(y + 0.002, box(0.5, fh, 2, mat.plaster, (s * (W - 0.5)) / 2, y + fh / 2, z)));
    }
  }
  const yc = y0 + 2 * fh;
  add(yc, box(W + 0.6, 0.4, D + 0.6, mat.white, 0, yc + 0.2, 0));
  // roof: two slopes
  [1, -1].forEach(s => {
    const slab = box(W + 0.4, 0.25, D / 2 + 0.6, mat.roof, 0, yc + 1.05, (s * D) / 4);
    slab.rotation.x = s * 0.45;
    add(yc + 0.4, slab);
  });
  // portico: columns and a pediment
  [-3, -1, 1, 3].forEach(x => {
    const col = cylinder(0.32, 0.36, 2 * fh, mat.white, y0, 12);
    col.position.set(x, col.position.y, D / 2 + 1.1);
    add(y0 + 0.01, col);
  });
  add(yc, box(8.4, 0.5, 1.8, mat.white, 0, yc + 0.25, D / 2 + 0.9));
  add(yc + 0.5, box(7, 0.6, 1.6, mat.white, 0, yc + 0.8, D / 2 + 0.9), box(4, 0.5, 1.5, mat.white, 0, yc + 1.35, D / 2 + 0.9));
  // clock tower
  const tb = yc + 0.4;
  for (let i = 0; i < 5; i++) add(tb + i * 1.2, box(3, 1.2, 3, i % 2 ? mat.plaster : mat.sand, 0, tb + 0.6 + i * 1.2, 0));
  const clock = cylinder(0.9, 0.9, 0.12, mat.white, 0, 24);
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, tb + 4.2, 1.56);
  add(tb + 3.3, clock, box(0.08, 0.6, 0.05, mat.ridge, 0, tb + 4.4, 1.64), box(0.45, 0.08, 0.05, mat.ridge, 0.2, tb + 4.2, 1.64));
  const spire = shade(new THREE.Mesh(new THREE.ConeGeometry(2.3, 3.2, 4), mat.roof));
  spire.rotation.y = Math.PI / 4;
  spire.position.y = tb + 6 + 1.6;
  add(tb + 6, spire);
  add(tb + 9.2, box(0.08, 1.6, 0.08, mat.ridge, 0, tb + 10, 0), box(0.9, 0.55, 0.05, mat.flag, 0.48, tb + 10.4, 0));
  return { grp, pieces: done(), height: tb + 10.8 };
}

/** Landmarks are modelled at house scale, then enlarged to tower over the city's houses. */
const SCALE: Record<Landmark, number> = { baiterek: 1.7, koktobe: 1.4, townhall: 1.5 };

export function buildLandmark(kind: Landmark, mat: Materials, prim: Primitives): LandmarkModel {
  const lm = kind === "baiterek" ? baiterek(mat, prim) : kind === "koktobe" ? koktobe(mat, prim) : townhall(mat, prim);
  lm.grp.scale.setScalar(SCALE[kind]);
  return { ...lm, height: lm.height * SCALE[kind] };
}
