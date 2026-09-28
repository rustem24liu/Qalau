import * as THREE from "three";
import { FINAL_STAGE, GOAL_TYPES, type GoalType } from "@qalau/core";
import { Builder } from "./builder";
import { buildHouse, type House } from "./house";
import { houseConfigs } from "./houseConfig";
import { createLighting } from "./lighting";
import { createBlueprintMaterial, createMaterials } from "./materials";
import { createPrimitives } from "./primitives";
import type { SceneApi, SceneOptions, Thumb } from "./types";

// Colors were picked for r128, which rendered hex colors as-is (no sRGB conversion).
THREE.ColorManagement.enabled = false;

const THUMB_W = 140, THUMB_H = 105;

function makeRenderer(extra?: THREE.WebGLRendererParameters) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, ...extra });
  r.outputColorSpace = THREE.LinearSRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

/** Isometric three.js scene. Returns null if WebGL is unavailable. */
export function createScene3D({ night: startNight, reducedMotion: reduced }: SceneOptions): SceneApi | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = makeRenderer(); } catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const cv = renderer.domElement;
  cv.setAttribute("aria-label", "3D-модель постройки");

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const cam = new THREE.OrthographicCamera(-10, 10, 7.5, -7.5, 0.1, 200);
  const dir = new THREE.Vector3(1, 0.78, 1).normalize();

  const mat = createMaterials();
  const bpMat = createBlueprintMaterial();
  const prim = createPrimitives();
  const light = createLighting(scene, mat, bpMat);
  const CFG = houseConfigs(mat);
  const B = Object.fromEntries(GOAL_TYPES.map(t => [t, buildHouse(world, CFG[t], mat, bpMat, prim)])) as Record<GoalType, House>;
  const builder = new Builder(mat, prim);
  world.add(builder.group);

  let curType: GoalType | null = null, curGoal: string | null = null;
  let W0 = 1, H0 = 1, needs = true;
  let working = false, nextIdx = 0;
  const cur = () => (curType ? B[curType] : undefined);

  // ---- camera ----
  function fit(type: GoalType, w: number, h: number) {
    const [minH, minHAt1] = CFG[type].view, ty = CFG[type].ty, aspect = w / h;
    const halfH = Math.max(minH, minHAt1 / aspect);
    Object.assign(cam, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
    cam.position.set(dir.x * 50, ty + dir.y * 50, dir.z * 50);
    cam.lookAt(0, ty, 0);
    cam.updateProjectionMatrix();
  }

  // ---- drag to rotate ----
  let drag: { x: number } | null = null, vel = 0;
  cv.addEventListener("pointerdown", e => { drag = { x: e.clientX }; vel = 0; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.x = e.clientX;
    world.rotation.y += dx * 0.012;
    vel = dx * 0.012;
    needs = true;
  });
  const endDrag = () => { drag = null; };
  cv.addEventListener("pointerup", endDrag);
  cv.addEventListener("pointercancel", endDrag);

  // ---- day / dusk (finale) / night ----
  let dusk = 0, duskT = 0, night = startNight ? 1 : 0, nightT = night;

  // ---- render loop ----
  function frame(t: number) {
    const h = cur();
    if (!h) return;
    let active = false;
    for (const p of h.pieces) {
      if (!p.anim) continue;
      active = true;
      if (t < p.t0) continue;
      p.obj.visible = true;
      const u = (t - p.t0) / 480;
      if (u >= 1) { p.obj.position.y = 0; p.anim = false; }
      else if (u < 0.78) { const q = 1 - u / 0.78; p.obj.position.y = 6 * q * q; }
      else p.obj.position.y = 0.16 * Math.sin(((u - 0.78) / 0.22) * Math.PI);
    }
    const busy = h.pieces.some(p => p.anim);
    let envChanged = false;
    if (Math.abs(dusk - duskT) > 0.001 && !busy) {
      dusk += (duskT - dusk) * 0.035;
      if (Math.abs(dusk - duskT) < 0.002) dusk = duskT;
      envChanged = true;
    }
    if (Math.abs(night - nightT) > 0.001) {
      night += (nightT - night) * 0.06;
      if (Math.abs(night - nightT) < 0.002) night = nightT;
      envChanged = true;
    }
    if (envChanged || busy) { light.apply(dusk, night, h); active = true; }
    if (!drag && Math.abs(vel) > 0.0004) { world.rotation.y += vel; vel *= 0.93; active = true; }
    if (builder.update(t, h, { working, nextIdx, busy, finale: duskT === 1 && !reduced })) active = true;
    if (h.puffs.length && h.puffs[0].parent?.visible && !reduced) {
      h.puffs.forEach((p, i) => {
        const base = p.userData.base as THREE.Vector3, ph = t / 1400 + i * 1.3;
        p.position.set(base.x + Math.sin(ph) * 0.12, base.y + Math.sin(ph * 0.8) * 0.12, base.z);
        p.scale.setScalar(1 + 0.08 * Math.sin(ph * 1.2));
      });
      active = true;
    }
    if (active || needs) { renderer.render(scene, cam); needs = false; }
  }

  // ---- thumbnails (separate offscreen renderer, cached) ----
  let thumbRenderer: THREE.WebGLRenderer | null = null;
  const cache = new Map<string, Thumb>();
  function thumb(type: GoalType, k: number, nightOn: boolean): Thumb | null {
    const key = type + "|" + k + "|" + nightOn;
    const hit = cache.get(key);
    if (hit) return hit;
    try {
      if (!thumbRenderer) {
        thumbRenderer = makeRenderer({ preserveDrawingBuffer: true });
        thumbRenderer.setPixelRatio(2);
        thumbRenderer.setSize(THUMB_W, THUMB_H, false);
      }
      const h = B[type];
      // snapshot live state, pose the model, render, restore
      const vis = GOAL_TYPES.map(t => [t, B[t].grp.visible] as const);
      const saved = h.pieces.map(p => [p.obj.visible, p.obj.position.y] as const);
      const rot = world.rotation.y;
      GOAL_TYPES.forEach(t => { B[t].grp.visible = t === type; });
      h.pieces.forEach((p, i) => { p.obj.visible = i < k; p.obj.position.y = 0; });
      world.rotation.y = 0;
      builder.group.visible = false;
      light.apply(k >= h.N ? 1 : 0, nightOn ? 1 : 0, h);
      fit(type, THUMB_W, THUMB_H);
      thumbRenderer.render(scene, cam);
      const src = thumbRenderer.domElement.toDataURL("image/png");

      h.pieces.forEach((p, i) => { p.obj.visible = saved[i][0]; p.obj.position.y = saved[i][1]; });
      vis.forEach(([t, v]) => { B[t].grp.visible = v; });
      world.rotation.y = rot;
      builder.group.visible = true;
      if (curType) fit(curType, W0, H0);
      light.apply(dusk, night, cur());
      needs = true;
      const res: Thumb = { kind: "img", src };
      cache.set(key, res);
      return res;
    } catch {
      return null;
    }
  }

  return {
    is3D: true,
    pieceCount: type => B[type].N,
    stageOf: (type, i) => B[type].pieces[i]?.stage ?? FINAL_STAGE,
    stages: type => B[type].stageSet,

    mount(host) {
      host.appendChild(cv);
      const resize = () => {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        W0 = w; H0 = h;
        renderer.setSize(w, h, false);
        if (curType) fit(curType, w, h);
        needs = true;
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();
      renderer.setAnimationLoop(frame);
      return () => {
        renderer.setAnimationLoop(null);
        ro.disconnect();
        cv.remove();
      };
    },

    show(goalId, type, k) {
      const h = B[type];
      const animate = goalId === curGoal && type === curType && !reduced;
      if (type !== curType) {
        GOAL_TYPES.forEach(t => { B[t].grp.visible = t === type; });
        curType = type;
        fit(type, W0, H0);
      }
      builder.placeAt(h);
      nextIdx = Math.min(k, h.N - 1);
      curGoal = goalId;
      const now = performance.now();
      let order = 0;
      h.pieces.forEach((p, i) => {
        const want = i < k;
        if (want && !p.on) {
          p.on = true;
          if (animate) { p.anim = true; p.t0 = now + Math.min(1800, order * 26); p.obj.visible = false; order++; }
          else { p.anim = false; p.obj.visible = true; p.obj.position.y = 0; }
        } else if (want && p.on && !animate && p.anim) {
          p.anim = false; p.obj.visible = true; p.obj.position.y = 0;
        } else if (!want && p.on) {
          p.on = false; p.anim = false; p.obj.visible = false; p.obj.position.y = 0;
        }
      });
      duskT = k >= h.N ? 1 : 0;
      if (!animate) dusk = duskT;
      light.apply(dusk, night, h);
      needs = true;
    },

    setNight(on) {
      nightT = on ? 1 : 0;
      if (reduced) { night = nightT; light.apply(dusk, night, cur()); }
      needs = true;
    },

    setWorking(on) {
      if (working !== on) { working = on; needs = true; }
    },

    thumb,
  };
}
