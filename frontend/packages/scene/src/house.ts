import * as THREE from "three";
import type { HouseConfig, Wall } from "./houseConfig";
import type { Materials } from "./materials";
import type { Primitives } from "./primitives";

/** One unit of progress: a group of meshes that drops in together. */
export interface Piece {
  stage: number;
  obj: THREE.Group;
  on: boolean;
  anim: boolean;
  t0: number;
}

export interface House {
  cfg: HouseConfig;
  grp: THREE.Group;
  pieces: Piece[];
  N: number;
  stageSet: number[];
  puffs: THREE.Mesh[];
  doorPiece: Piece;
  warmPos: THREE.Vector3;
  dims: { hx: number; hz: number; IX: number; IZ: number };
  /** Builder's bed: he walks to `foot`, then lies down toward -z at height `top`. */
  bed: { foot: THREE.Vector3; top: number };
  /** Tall grass for a goal left alone for two weeks (see setNeglect). */
  weeds: THREE.Group;
  /** "Abandoned" sign for a goal left alone for a month. */
  sign: THREE.Group;
  /** Where the builder waits, and the control console he presses. */
  idle: THREE.Vector3;
  cpos: THREE.Vector3;
  btn: THREE.Mesh;
  btnY: number;
}

export interface BuildOptions {
  /** A house on a city lot: no floating island, no bed, no console — just the building and its garden. */
  lot?: boolean;
}

export function buildHouse(
  parent: THREE.Object3D, cfg: HouseConfig, mat: Materials, bpMat: THREE.LineBasicMaterial, { box, blob }: Primitives,
  { lot = false }: BuildOptions = {},
): House {
  const grp = new THREE.Group();
  grp.visible = false;
  parent.add(grp);
  const { W, D, rows } = cfg;
  const hx = W / 2, hz = D / 2, [IW, ID] = cfg.island, IX = IW / 2, IZ = ID / 2;
  const y0 = 0.4;

  // ---- island ----
  if (!lot) {
    grp.add(box(IW, 0.34, ID, mat.grass, 0, -0.17, 0));
    grp.add(box(IW - 0.4, 1.3, ID - 0.4, mat.dirt, 0, -0.99, 0));
    grp.add(box(IW - 1.8, 0.9, ID - 1.8, mat.dirt2, 0, -2.0, 0));
    grp.add(box(Math.max(2, IW - 4.4), 0.6, Math.max(2, ID - 4.2), mat.dirt2, 0, -2.7, 0));
    ([[-1, -1], [1, 1], [-1, 1], [1, -0.3]] as const).forEach(([sx, sz], i) =>
      grp.add(box(0.5, 0.36, 0.5, i % 2 ? mat.grass2 : mat.grass, sx * (IX - 0.7), 0.18, sz * (IZ - 0.6))));
  }

  // ---- roof geometry ----
  const Yw = y0 + rows * 0.5, rh = cfg.ridge, eZ = hz + 0.4, slope = rh / hz;
  const yR = Yw + rh, yE = yR - slope * eZ, th = Math.atan2(rh, hz), L = Math.hypot(eZ, yR - yE);

  // ---- blueprint (wireframe of the finished building) ----
  const bp = new THREE.Group();
  const wb = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, rows * 0.5, D)), bpMat);
  wb.position.set(0, y0 + rows * 0.25, 0);
  bp.add(wb);
  const rx = hx + 0.5;
  const P = [[-rx, yE, eZ], [-rx, yR, 0], [-rx, yE, -eZ], [rx, yE, eZ], [rx, yR, 0], [rx, yE, -eZ]];
  const arr: number[] = [];
  [[0, 1], [1, 2], [0, 2], [3, 4], [4, 5], [3, 5], [0, 3], [1, 4], [2, 5]].forEach(([a, b]) => arr.push(...P[a], ...P[b]));
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  bp.add(new THREE.LineSegments(rg, bpMat));
  grp.add(bp);

  const pieces: Piece[] = [];
  const piece = (stage: number, ...meshes: THREE.Object3D[]) => {
    const g = new THREE.Group();
    meshes.forEach(m => g.add(m));
    g.visible = false;
    grp.add(g);
    const p: Piece = { stage, obj: g, on: false, anim: false, t0: 0 };
    pieces.push(p);
    return p;
  };
  const bm = (a: number, b: number) => cfg.walls[Math.abs(a * 7 + b * 13) % 3];

  // ---- 0: foundation ----
  const fw = (W + 0.4) / 2, fd = (D + 0.4) / 2;
  ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).forEach(([sx, sz]) =>
    piece(0, box(fw - 0.02, 0.4, fd - 0.02, mat.found, (sx * fw) / 2, 0.2, (sz * fd) / 2)));

  // ---- 1: walls, brick by brick, leaving openings ----
  const dr = cfg.door;
  const open = (wall: Wall, c: number, r: number) => {
    if (wall === "front" && Math.abs(c - dr.c) < dr.w / 2 && r < dr.rows) return true;
    return cfg.wins.some(w => w.wall === wall && Math.abs(c - w.c) < w.w / 2 && r >= w.r[0] && r <= w.r[1]);
  };
  for (let r = 0; r < rows; r++) {
    const y = y0 + 0.25 + 0.5 * r;
    for (let i = 0; i < W; i++) { const x = -(W - 1) / 2 + i; if (!open("front", x, r)) piece(1, box(0.96, 0.46, 0.5, bm(i, r), x, y, hz - 0.25)); }
    for (let i = 0; i < D - 1; i++) { const z = (D - 2) / 2 - i; if (!open("right", z, r)) piece(1, box(0.5, 0.46, 0.96, bm(i + 3, r), hx - 0.25, y, z)); }
    for (let i = 0; i < W; i++) { const x = (W - 1) / 2 - i; if (!open("back", x, r)) piece(1, box(0.96, 0.46, 0.5, bm(i + 5, r), x, y, -(hz - 0.25))); }
    for (let i = 0; i < D - 1; i++) { const z = -(D - 2) / 2 + i; if (!open("left", z, r)) piece(1, box(0.5, 0.46, 0.96, bm(i + 1, r), -(hx - 0.25), y, z)); }
  }

  // ---- 2: windows and door ----
  cfg.wins.forEach(w => {
    const h = 0.5 * (w.r[1] - w.r[0] + 1), yc = y0 + 0.5 * w.r[0] + h / 2, ys = y0 + 0.5 * w.r[0] - 0.03;
    if (w.wall === "front" || w.wall === "back") {
      const s = w.wall === "front" ? 1 : -1, z = s * (hz - 0.25);
      piece(2, box(w.w, h, 0.52, mat.frame, w.c, yc, z), box(w.w - 0.26, h - 0.26, 0.58, mat.glass, w.c, yc, z),
        box(0.06, h - 0.26, 0.62, mat.frame, w.c, yc, z), box(w.w + 0.2, 0.1, 0.72, mat.frame, w.c, ys, z + s * 0.11));
    } else {
      const s = w.wall === "right" ? 1 : -1, x = s * (hx - 0.25);
      piece(2, box(0.52, h, w.w, mat.frame, x, yc, w.c), box(0.58, h - 0.26, w.w - 0.26, mat.glass, x, yc, w.c),
        box(0.62, h - 0.26, 0.06, mat.frame, x, yc, w.c), box(0.72, 0.1, w.w + 0.2, mat.frame, x + s * 0.11, ys, w.c));
    }
  });
  const dh = dr.rows * 0.5, lw = Math.max(0.7, dr.w - 0.5), zf = hz - 0.25;
  const doorPiece = piece(2, box(dr.w, dh, 0.5, mat.frame, dr.c, y0 + dh / 2, zf),
    box(lw, dh - 0.16, 0.56, mat.door, dr.c, y0 + (dh - 0.16) / 2, zf),
    box(0.12, 0.12, 0.66, mat.knob, dr.c + lw / 2 - 0.18, y0 + dh * 0.47, zf));
  piece(2, box(dr.w + 0.2, 0.3, 0.8, mat.stone, dr.c, 0.15, hz + 0.6));

  // ---- 3: roof (gables, tiles, ridge) ----
  for (let k = 0; k < Math.ceil(rh / 0.5); k++) {
    const hw = hz * (1 - (0.5 * (k + 1)) / rh) + 0.2;
    if (hw < 0.25) continue;
    [1, -1].forEach(s => piece(3, box(0.5, 0.5, 2 * hw, cfg.gable, s * (hx - 0.25), Yw + 0.25 + 0.5 * k, 0)));
  }
  const tr = cfg.tileRows;
  for (let j = 0; j < tr; j++) {
    const t = (j + 0.5) / tr;
    [1, -1].forEach(s => {
      for (let i = 0; i <= W; i++) {
        const x = -W / 2 + i;
        const z = s * eZ * (1 - t) + s * Math.sin(th) * 0.1;
        const y = yE + (yR - yE) * t + Math.cos(th) * 0.1;
        piece(3, box(1.0, 0.14, L / tr + 0.03, cfg.roof[(i + j) % 2], x, y, z, s * th));
      }
    });
  }
  piece(3, box(W + 1.2, 0.24, 0.5, mat.ridge, 0, yR + 0.14, 0));

  // ---- 4: chimney and smoke ----
  let puffs: THREE.Mesh[] = [];
  if (cfg.chimney) {
    const cx = hx - 1.8, cz = -hz * 0.43, bottom = yR - slope * Math.abs(cz) - 0.3;
    const n = Math.ceil((yR + 1.0 - bottom) / 0.55);
    for (let i = 0; i < n; i++) piece(4, box(0.8, 0.53, 0.8, i % 2 ? mat.chim : mat.brick2, cx, bottom + 0.275 + 0.55 * i, cz));
    const top = bottom + 0.55 * n;
    piece(4, box(1.0, 0.16, 1.0, mat.cap, cx, top + 0.08, cz));
    puffs = [
      blob(0.34, mat.smoke, cx, top + 0.65, cz),
      blob(0.46, mat.smoke, cx + 0.3, top + 1.35, cz + 0.15),
      blob(0.58, mat.smoke, cx + 0.75, top + 2.2, cz + 0.3),
    ];
    puffs.forEach(p => { p.castShadow = false; p.userData.base = p.position.clone(); });
    piece(4, ...puffs);
  }

  // ---- 5: garden ----
  const gz = cfg.garden;
  if (gz >= 2) piece(5, box(0.34, 1.5, 0.34, mat.trunk, IX - 1.6, 0.75, -(IZ - 1.8)), blob(1.15, mat.leaf, IX - 1.6, 2.15, -(IZ - 1.8)), blob(0.8, mat.leaf2, IX - 1.25, 2.95, -(IZ - 2.0)));
  if (gz >= 3) piece(5, box(0.28, 1.1, 0.28, mat.trunk, -(IX - 1.3), 0.55, IZ - 1.9), blob(0.85, mat.leaf2, -(IX - 1.3), 1.6, IZ - 1.9), blob(0.55, mat.leaf, -(IX - 1.55), 2.2, IZ - 1.75));
  if (gz >= 2) piece(5, blob(0.55, mat.leaf, -(IX - 1.4), 0.42, -(IZ - 1.6)), blob(0.42, mat.leaf2, -(IX - 0.8), 0.34, -(IZ - 2.4)));
  piece(5, blob(0.5, mat.leaf2, IX - 1.1, 0.38, hz - 0.6), blob(0.36, mat.leaf, IX - 0.8, 0.3, hz - 1.4));
  const stones: THREE.Mesh[] = [];
  [hz + 1.35, hz + 2.0, hz + 2.65, hz + 3.3, hz + 3.95].forEach((z, i) => {
    if (z + 0.4 < IZ) stones.push(box(i % 2 ? 0.8 : 0.9, 0.08, i % 2 ? 0.55 : 0.6, mat.stone, dr.c + (i % 2 ? 0.2 : -0.15), 0.04, z));
  });
  if (stones.length) piece(5, ...stones);
  const bed: THREE.Mesh[] = [], bz = hz + 0.55;
  const addBed = (a: number, b: number) => {
    let i = 0;
    for (let x = a; x <= b && i < 6; x += 0.38, i++) bed.push(box(0.24, 0.24, 0.24, [mat.fl1, mat.fl2, mat.fl3][i % 3], x, 0.3, bz + (i % 2) * 0.18));
  };
  addBed(-hx + 0.2, dr.c - dr.w / 2 - 0.5);
  addBed(dr.c + dr.w / 2 + 0.5, hx - 0.2);
  if (bed.length) piece(5, ...bed);

  // ---- 6: finale — flag and street lamp ----
  const fin: THREE.Mesh[] = [];
  if (cfg.flag) fin.push(box(0.08, 1.3, 0.08, mat.ridge, -(hx + 0.3), yR + 0.8, 0), box(0.8, 0.5, 0.05, mat.flag, -(hx + 0.3) + 0.44, yR + 1.2, 0));
  const lx = dr.c + dr.w / 2 + 0.75, lz = Math.min(hz + 1.4, IZ - 0.5);
  fin.push(box(0.12, 1.8, 0.12, mat.ridge, lx, 0.9, lz), box(0.32, 0.32, 0.32, mat.lamp, lx, 1.95, lz));
  piece(6, ...fin);

  // ---- neglect: tall grass around and inside the footprint, and a boarded-up sign ----
  const weeds = new THREE.Group();
  for (let i = 0; i < 90; i++) {
    // deterministic scatter: a ring round the walls plus a few tufts inside
    const a = i * 2.39996, inside = i % 5 === 0;
    const rr = inside ? 0.5 + (i % 3) * 0.35 : 1 + 0.18 * (i % 4);
    const x = Math.cos(a) * (hx * rr + (inside ? 0 : 0.3)), z = Math.sin(a) * (hz * rr + (inside ? 0 : 0.3));
    const h = 0.35 + 0.22 * ((i * 7) % 5);
    weeds.add(box(0.16, h, 0.16, i % 3 ? mat.grass2 : mat.leaf, x, h / 2, z), box(0.13, h * 0.7, 0.13, mat.grass, x + 0.15, (h * 0.7) / 2, z + 0.09),
      box(0.12, h * 0.55, 0.12, mat.leaf2, x - 0.13, (h * 0.55) / 2, z - 0.08));
  }
  weeds.visible = false;
  grp.add(weeds);
  const sign = new THREE.Group();
  const sx = dr.c + dr.w / 2 + 0.9, sz = hz + 1.5;
  sign.add(box(0.12, 1.4, 0.12, mat.wood2, sx, 0.7, sz), box(1.1, 0.6, 0.08, mat.wood3, sx, 1.25, sz + 0.07));
  const plank = (r: number) => { const p = box(1.2, 0.1, 0.06, mat.brick, sx, 1.25, sz + 0.13); p.rotation.z = r; return p; };
  sign.add(plank(0.45), plank(-0.45));
  sign.visible = false;
  grp.add(sign);

  // ---- builder's camp (static): bed and nightstand right of the house (the side facing the camera) ----
  const bedX = hx + 2.4, bedL = 2.3, bedW = 1.15, legH = 0.3, matTop = legH + 0.32;
  const camp = new THREE.Group();
  camp.add(box(bedW, 0.14, bedL, mat.wood2, bedX, legH, 0));                       // frame
  ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).forEach(([sx, sz]) =>
    camp.add(box(0.12, legH, 0.12, mat.wood2, bedX + sx * (bedW / 2 - 0.08), legH / 2, sz * (bedL / 2 - 0.08))));
  camp.add(box(bedW + 0.04, 0.7, 0.14, mat.wood, bedX, legH + 0.3, -bedL / 2));   // headboard
  camp.add(box(bedW - 0.1, 0.18, bedL - 0.12, mat.frame, bedX, matTop - 0.09, 0)); // mattress
  camp.add(box(0.7, 0.14, 0.4, mat.plaster, bedX, matTop + 0.06, -bedL / 2 + 0.36)); // pillow
  camp.add(box(bedW - 0.04, 0.08, bedL * 0.58, mat.teal2, bedX, matTop + 0.02, bedL / 2 - bedL * 0.29)); // blanket
  const nsX = bedX + bedW / 2 + 0.45, nsZ = -bedL / 2 + 0.35; // outer side, clear of the path round the house
  camp.add(box(0.5, 0.5, 0.5, mat.wood, nsX, 0.25, nsZ));                          // nightstand
  camp.add(box(0.1, 0.22, 0.1, mat.ridge, nsX, 0.61, nsZ));
  camp.add(box(0.26, 0.2, 0.26, mat.lamp, nsX, 0.8, nsZ));                         // glows at night
  camp.add(box(bedW + 0.7, 0.03, 1.1, mat.fl2, bedX, 0.015, bedL / 2 + 0.55));      // rug at the foot
  if (!lot) grp.add(camp);

  // ---- control console (static): the builder presses its button when tasks are ticked off ----
  const idle = new THREE.Vector3(dr.c - dr.w / 2 - 1.7, 0, Math.min(hz + 2.0, IZ - 1.1));
  const cpos = new THREE.Vector3(idle.x + 0.46, 0, idle.z + 0.42);
  const con = new THREE.Group();
  con.position.copy(cpos);
  con.rotation.y = Math.atan2(idle.x - cpos.x, idle.z - cpos.z);
  con.add(box(0.42, 0.6, 0.36, mat.conBody, 0, 0.3, 0));
  con.add(box(0.48, 0.07, 0.42, mat.conPanel, 0, 0.635, 0));
  con.add(box(0.44, 0.06, 0.02, mat.flag, 0, 0.45, 0.19));
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.07, 12), mat.conBtn);
  btn.position.set(0, 0.7, 0.03);
  btn.castShadow = true;
  con.add(btn);
  con.add(box(0.03, 0.42, 0.03, mat.ridge, -0.17, 0.88, -0.14));
  con.add(box(0.08, 0.08, 0.08, mat.conLight, -0.17, 1.12, -0.14));
  con.scale.setScalar(1.25);
  if (!lot) grp.add(con);

  return {
    cfg, grp, pieces, N: pieces.length,
    stageSet: [...new Set(pieces.map(p => p.stage))],
    puffs, doorPiece,
    warmPos: new THREE.Vector3(dr.c, y0 + 1.8, hz + 1.1),
    dims: { hx, hz, IX, IZ },
    bed: { foot: new THREE.Vector3(bedX, 0, bedL / 2 - 0.05), top: matTop },
    weeds, sign,
    idle, cpos, btn, btnY: 0.7,
  };
}

/** 0 — tidy, 1 — overgrown, 2 — overgrown and marked abandoned. */
export function setNeglect(h: House, n: number): void {
  h.weeds.visible = n >= 1;
  h.sign.visible = n >= 2;
}
