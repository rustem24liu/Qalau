import * as THREE from "three";
import type { House } from "./house";
import type { Materials } from "./materials";
import type { Primitives } from "./primitives";

export interface BuilderFrame {
  /** A timer is running: walk to the current piece and hammer. */
  working: boolean;
  /** Index of the next piece to be placed. */
  nextIdx: number;
  /** Extra builders work this many pieces ahead so they don't crowd one spot. */
  offset: number;
  /** Only the main builder presses the console and celebrates. */
  main: boolean;
  /** Pieces are dropping in (a task was ticked off): press the console button. */
  busy: boolean;
  /** Building is complete: jump for joy. */
  finale: boolean;
}

export type Mood = "normal" | "tired" | "rest" | "cheer";

/** The little construction worker who walks around the island. */
export class Builder {
  readonly group = new THREE.Group();
  /** tired: slow, droopy hammering; rest: sleeps in the bed; cheer: jumps. */
  mood: Mood = "normal";
  /** 0 = standing, 1 = lying in bed. */
  private lie = 0;
  private legL: THREE.Group;
  private legR: THREE.Group;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private face = 0;
  private lastT = 0;
  private lastPress = false;
  private placedFor: House | null = null;

  constructor(private mat: Materials, { box }: Primitives, vest: THREE.Material = mat.vest) {
    const g = this.group;
    g.rotation.order = "YXZ"; // turn first, then tip over to lie down
    const limb = (x: number, y: number) => { const l = new THREE.Group(); l.position.set(x, y, 0); g.add(l); return l; };
    this.legL = limb(-0.1, 0.42);
    this.legR = limb(0.1, 0.42);
    [this.legL, this.legR].forEach(l => {
      l.add(box(0.16, 0.4, 0.18, mat.pants, 0, -0.2, 0));
      l.add(box(0.18, 0.08, 0.26, mat.boot, 0, -0.39, 0.03));
    });
    g.add(box(0.44, 0.46, 0.28, vest, 0, 0.65, 0));
    g.add(box(0.45, 0.05, 0.29, mat.stripe, 0, 0.58, 0));
    g.add(box(0.45, 0.05, 0.29, mat.stripe, 0, 0.72, 0));
    g.add(box(0.3, 0.3, 0.3, mat.skin, 0, 1.04, 0));
    g.add(box(0.05, 0.05, 0.02, mat.eye, -0.07, 1.07, 0.155));
    g.add(box(0.05, 0.05, 0.02, mat.eye, 0.07, 1.07, 0.155));
    g.add(box(0.36, 0.13, 0.36, mat.hat, 0, 1.24, 0));
    g.add(box(0.46, 0.04, 0.46, mat.hat, 0, 1.18, 0.03));
    this.armL = limb(-0.29, 0.85);
    this.armR = limb(0.29, 0.85);
    [this.armL, this.armR].forEach(a => {
      a.add(box(0.12, 0.38, 0.14, vest, 0, -0.18, 0));
      a.add(box(0.11, 0.1, 0.12, mat.skin, 0, -0.41, 0));
    });
    // hammer
    this.armR.add(box(0.05, 0.05, 0.4, mat.handle, 0, -0.43, 0.2));
    this.armR.add(box(0.12, 0.1, 0.22, mat.steel, 0, -0.43, 0.42));
    g.scale.setScalar(1.45);
  }

  /** Puts the builder at the idle spot (shifted by dx) when the building type changes. */
  placeAt(h: House, dx = 0, force = false): void {
    if (this.placedFor === h && !force) return;
    this.group.position.set(h.idle.x + dx, 0, h.idle.z);
    this.group.rotation.y = Math.PI / 4;
    this.placedFor = h;
  }

  /** Advances one frame; returns true if anything moved and a redraw is needed. */
  update(t: number, h: House, f: BuilderFrame): boolean {
    const bld = this.group;
    const dt = Math.min(0.05, this.lastT ? (t - this.lastT) / 1000 : 0);
    this.lastT = t;
    const pressing = f.main && !f.working && f.busy;

    const toBed = f.main && !f.working && this.mood === "rest";
    let target: { x: number; z: number }, fx: number | null = null, fz: number | null = null;
    if (f.working) {
      const cur = f.main ? h.pieces.findIndex(p => p.anim) : -1;
      const w = workSpot(h, cur >= 0 ? cur : f.nextIdx + f.offset);
      target = w; fx = w.fx; fz = w.fz;
    } else target = toBed ? { x: h.bed.foot.x, z: h.bed.foot.z } : { x: h.idle.x, z: h.idle.z };

    // walk around the house through the nearest corner instead of through the walls
    let tx = target.x, tz = target.z;
    const px = bld.position.x, pz = bld.position.z;
    if (crosses(h, px, pz, tx, tz)) {
      const cx = h.dims.hx + 0.9, cz = h.dims.hz + 0.9;
      // prefer a corner that sees the target (shortest two-leg path); if the target is on the
      // far side, head for the reachable corner nearest to it and go on from there
      let best: [number, number] | null = null, bd = 1e9, direct = false;
      for (const [wx, wz] of [[cx, cz], [-cx, cz], [cx, -cz], [-cx, -cz]] as const) {
        const here = Math.hypot(wx - px, wz - pz);
        if (here < 0.1 || crosses(h, px, pz, wx, wz)) continue;
        const sees = !crosses(h, wx, wz, tx, tz);
        if (direct && !sees) continue;
        const dd = sees ? here + Math.hypot(tx - wx, tz - wz) : Math.hypot(tx - wx, tz - wz);
        if ((sees && !direct) || dd < bd) { bd = dd; best = [wx, wz]; direct = sees; }
      }
      if (best) [tx, tz] = best;
    }

    const dx = tx - px, dz = tz - pz, dist = Math.hypot(dx, dz);
    // lie down once at the foot of the bed; get up before walking anywhere else
    const inBed = toBed && dist <= 0.06;
    this.lie = Math.max(0, Math.min(1, this.lie + (inBed ? 1 : -1) * dt * 1.6));
    const walking = dist > 0.06 && this.lie === 0;
    const e = this.lie * this.lie * (3 - 2 * this.lie); // smoothstep
    if (walking) {
      const st = Math.min(dist, 2.8 * dt);
      bld.position.x += (dx / dist) * st;
      bld.position.z += (dz / dist) * st;
      this.face = Math.atan2(dx, dz);
    } else if (inBed || this.lie > 0) this.face = 0; // feet to the rug, head to the pillow (-z)
    else if (fx !== null && fz !== null) this.face = Math.atan2(fx - bld.position.x, fz - bld.position.z);
    else if (pressing) this.face = Math.atan2(h.cpos.x - bld.position.x, h.cpos.z - bld.position.z);
    else this.face = Math.PI / 4;
    let dr = this.face - bld.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    bld.rotation.y += dr * Math.min(1, dt * 10);

    // pose
    let y = 0, aL = 0, aR = 0, lL = 0, lR = 0, zL = 0, zR = 0, press = 0;
    if (this.lie > 0) {
      aL = aR = -0.15; y = e * (h.bed.top + 0.2 + 0.012 * Math.sin(t / 700)); // back rests on the mattress
    } else if (walking) {
      const s = Math.sin(t / 95);
      lL = s * 0.7; lR = -s * 0.7; aL = -s * 0.6; aR = s * 0.6; y = Math.abs(Math.cos(t / 95)) * 0.05;
    } else if (f.working && this.mood === "tired") {
      aR = -1.6 + 1.0 * Math.abs(Math.sin(t / 320)); aL = -0.1; y = -0.04 + 0.015 * Math.sin(t / 400);
    } else if (f.working) {
      aR = -2.1 + 1.5 * Math.abs(Math.sin(t / 150)); aL = -0.5; y = 0.02 * Math.sin(t / 75);
    } else if (this.mood === "cheer" && f.main) {
      const j = Math.abs(Math.sin(t / 220));
      y = j * 0.45; aL = aR = -2.9; zL = 0.35; zR = -0.35;
    } else if (pressing) {
      press = Math.max(0, Math.sin(t / 170));
      aR = -0.95 + 0.32 * press; aL = -0.25;
    } else if (f.finale && f.main) {
      const j = Math.abs(Math.sin(t / 280));
      y = j * 0.38; aL = aR = -2.9; zL = 0.35; zR = -0.35;
    }
    if (f.main) {
      h.btn.position.y = h.btnY - 0.035 * press;
      this.mat.conBtn.emissiveIntensity = 0.25 + 0.9 * press;
      this.mat.conLight.emissiveIntensity = pressing ? (Math.sin(t / 110) > 0 ? 1.6 : 0.15) : f.working ? 0.9 : 0.2;
    }
    bld.position.y = y;
    bld.rotation.x = -e * Math.PI / 2;
    this.legL.rotation.x = lL; this.legR.rotation.x = lR;
    this.armL.rotation.x = aL; this.armR.rotation.x = aR;
    this.armL.rotation.z = zL; this.armR.rotation.z = zR;

    const flip = pressing !== this.lastPress;
    this.lastPress = pressing;
    return walking || f.working || pressing || (f.finale && f.main) || this.mood !== "normal" || flip || Math.abs(dr) > 0.01;
  }
}

const inRect = (h: House, x: number, z: number, d: number) => Math.abs(x) < h.dims.hx + d && Math.abs(z) < h.dims.hz + d;

function crosses(h: House, ax: number, az: number, bx: number, bz: number): boolean {
  for (let s = 1; s < 12; s++) {
    const u = s / 12;
    if (inRect(h, ax + (bx - ax) * u, az + (bz - az) * u, 0.5)) return true;
  }
  return false;
}

/** Spot next to piece i where the builder stands, plus the point he faces. */
function workSpot(h: House, i: number) {
  const m = h.pieces[Math.max(0, Math.min(i, h.N - 1))].obj.children[0];
  const p = m.position, d = h.dims;
  let x = p.x, z = p.z;
  if (Math.abs(x) < d.hx + 0.8 && Math.abs(z) < d.hz + 0.8) {
    const ex = d.hx + 0.9 - Math.abs(x), ez = d.hz + 0.9 - Math.abs(z);
    if (ex < ez) x = Math.sign(x || 1) * (d.hx + 0.9);
    else z = Math.sign(z || 1) * (d.hz + 0.9);
  } else {
    const l = Math.hypot(x, z) || 1;
    x -= (x / l) * 0.8;
    z -= (z / l) * 0.8;
  }
  x = Math.max(-(d.IX - 0.5), Math.min(d.IX - 0.5, x));
  z = Math.max(-(d.IZ - 0.5), Math.min(d.IZ - 0.5, z));
  return { x, z, fx: p.x, fz: p.z };
}
