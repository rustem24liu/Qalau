import * as THREE from "three";
import { FINAL_STAGE, GOAL_TYPES, type GoalType } from "@qalau/core";
import { Builder } from "./builder";
import { CityScene } from "./city";
import { buildHouse, setNeglect, type House } from "./house";
import { houseConfigs } from "./houseConfig";
import { createLighting } from "./lighting";
import { applyRoofTheme, createBlueprintMaterial, createMaterials, type RoofTheme } from "./materials";
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
  // builder 0 is always on site; the others show up only while their timers run
  const VESTS = [mat.vest, mat.vestBlue, mat.vestGreen];
  const builders: Builder[] = [];
  const addBuilder = () => {
    const b = new Builder(mat, prim, VESTS[builders.length % VESTS.length]);
    b.group.visible = builders.length === 0; // extras stay hidden until setWorkers places them
    builders.push(b);
    world.add(b.group);
    return b;
  };
  addBuilder();
  /** How far apart (in pieces) the builders work, and where extra ones appear. */
  const SPREAD = 9, SPAWN_DX = 0.9;

  let curType: GoalType | null = null, curGoal: string | null = null;
  let W0 = 1, H0 = 1, needs = true;
  let workers = 0, nextIdx = 0, roof: RoofTheme | null = null;
  const head = new THREE.Vector3();
  /** "city" shows the user's whole city instead of one building site. */
  let mode: "site" | "city" = "site";
  const city = new CityScene(world, mat, bpMat, prim, CFG);
  const cur = () => (mode === "site" && curType ? B[curType] : undefined);
  const SITE_SHADOW = 12;

  // ---- camera ----
  function fit(type: GoalType, w: number, h: number) {
    const [minH, minHAt1] = CFG[type].view, ty = CFG[type].ty, aspect = w / h;
    const halfH = Math.max(minH, minHAt1 / aspect);
    Object.assign(cam, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH });
    cam.position.set(dir.x * 50, ty + dir.y * 50, dir.z * 50);
    cam.lookAt(0, ty, 0);
    cam.updateProjectionMatrix();
  }

  function fitCity(w: number, h: number) {
    const aspect = w / h, s = city.size;
    const halfH = Math.max(s * 0.34, (s * 0.62) / aspect);
    Object.assign(cam, { left: -halfH * aspect, right: halfH * aspect, top: halfH, bottom: -halfH, far: 400 });
    cam.position.set(dir.x * 150, 4 + dir.y * 150, dir.z * 150);
    cam.lookAt(0, 4, 0);
    cam.updateProjectionMatrix();
  }

  const refit = () => {
    if (mode === "city") fitCity(W0, H0);
    else if (curType) fit(curType, W0, H0);
  };
  const applyLight = () => light.apply(mode === "city" ? 0 : dusk, night, cur());

  /** Builders live on the building site only; extras only while their timers run. */
  const syncBuilders = () => builders.forEach((b, j) => { b.group.visible = mode === "site" && (j === 0 || j < workers); });

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
    if (mode === "city") return frameCity();
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
    builders.forEach((b, j) => {
      if (j > 0 && !b.group.visible) return;
      const f = { working: j < workers, nextIdx, offset: j * SPREAD, main: j === 0, busy, finale: duskT === 1 && !reduced };
      if (b.update(t, h, f)) active = true;
    });
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

  function frameCity() {
    let active = false;
    if (Math.abs(night - nightT) > 0.001) {
      night += (nightT - night) * 0.06;
      if (Math.abs(night - nightT) < 0.002) night = nightT;
      applyLight();
      active = true;
    }
    if (!drag && Math.abs(vel) > 0.0004) { world.rotation.y += vel; vel *= 0.93; active = true; }
    if (active || needs) { renderer.render(scene, cam); needs = false; }
  }

  // ---- thumbnails (separate offscreen renderer, cached) ----
  let thumbRenderer: THREE.WebGLRenderer | null = null;
  const cache = new Map<string, Thumb>();
  function thumb(type: GoalType, k: number, nightOn: boolean): Thumb | null {
    const key = type + "|" + k + "|" + nightOn + "|" + roof;
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
      const shown = builders.map(b => b.group.visible), cityShown = city.group.visible;
      const neglectShown = [h.weeds.visible, h.sign.visible];
      city.group.visible = false;
      setNeglect(h, 0); // thumbnails are of the plain building
      builders.forEach(b => { b.group.visible = false; });
      light.apply(k >= h.N ? 1 : 0, nightOn ? 1 : 0, h);
      fit(type, THUMB_W, THUMB_H);
      thumbRenderer.render(scene, cam);
      const src = thumbRenderer.domElement.toDataURL("image/png");

      h.pieces.forEach((p, i) => { p.obj.visible = saved[i][0]; p.obj.position.y = saved[i][1]; });
      vis.forEach(([t, v]) => { B[t].grp.visible = v; });
      world.rotation.y = rot;
      builders.forEach((b, j) => { b.group.visible = shown[j]; });
      city.group.visible = cityShown;
      h.weeds.visible = neglectShown[0];
      h.sign.visible = neglectShown[1];
      refit();
      applyLight();
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
        refit();
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
      if (mode === "city") {
        // back from the city: force the site to be re-shown and re-fitted
        mode = "site";
        city.group.visible = false;
        curType = null;
        light.setExtent(SITE_SHADOW);
        syncBuilders();
      }
      const animate = goalId === curGoal && type === curType && !reduced;
      if (type !== curType) {
        GOAL_TYPES.forEach(t => { B[t].grp.visible = t === type; });
        curType = type;
        fit(type, W0, H0);
      }
      builders[0].placeAt(h);
      builders.slice(1).forEach((b, j) => b.placeAt(h, SPAWN_DX * (j + 1)));
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

    showCity(view) {
      if (mode !== "city") {
        mode = "city";
        GOAL_TYPES.forEach(t => { B[t].grp.visible = false; });
        city.group.visible = true;
        syncBuilders();
      }
      city.update(view);
      light.setExtent(city.size * 0.75);
      fitCity(W0, H0);
      applyLight();
      needs = true;
    },

    setNeglect(n) {
      GOAL_TYPES.forEach(t => setNeglect(B[t], n)); // one building per type is shared by all goals of it
      needs = true;
    },

    setRoof(theme) {
      if (theme === roof) return;
      roof = theme;
      applyRoofTheme(mat, theme);
      needs = true;
    },

    setNight(on) {
      nightT = on ? 1 : 0;
      if (reduced) { night = nightT; applyLight(); }
      needs = true;
    },

    setWorkers(n) {
      if (n === workers) return;
      while (builders.length < n) addBuilder();
      const h = cur();
      builders.forEach((b, j) => {
        if (j === 0) return;
        const on = j < n;
        if (on && !b.group.visible && h) b.placeAt(h, SPAWN_DX * j, true); // arrive from the console
        b.group.visible = on && mode === "site";
      });
      workers = n;
      needs = true;
    },

    setMood(mood) {
      if (builders[0].mood !== mood) { builders[0].mood = mood; needs = true; }
    },

    headAnchor() {
      const g = builders[0].group;
      if (!curType || !g.visible) return null;
      g.updateWorldMatrix(true, false);
      head.set(0, 1.45, 0);
      g.localToWorld(head).project(cam);
      return { x: (head.x + 1) / 2, y: (1 - head.y) / 2 };
    },

    thumb,
  };
}
