import * as THREE from "three";
import type { House } from "./house";
import type { Materials } from "./materials";

/**
 * The scene was tuned on three r128 with legacy (non-physical) lights.
 * Modern three drops the implicit ×π on light intensities, so we add it back;
 * the point light's falloff also differs, hence the extra factor (approximate).
 */
const LEGACY = Math.PI;
const WARM_FALLOFF = 1.5;

const ENV = {
  day: { hc: new THREE.Color(0xE4F0FF), hi: 0.78, sc: new THREE.Color(0xFFF4E2), si: 0.95 },
  dusk: { hc: new THREE.Color(0x9BA6D8), hi: 0.42, sc: new THREE.Color(0xFFA064), si: 0.55 },
  night: { hc: new THREE.Color(0x5A6796), hi: 0.40, sc: new THREE.Color(0xA7B8FF), si: 0.40 },
};

export function createLighting(scene: THREE.Scene, mat: Materials, bpMat: THREE.LineBasicMaterial) {
  const hemi = new THREE.HemisphereLight(0xE4F0FF, 0x8A7658, 0.78 * LEGACY);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xFFF4E2, 0.95 * LEGACY);
  sun.position.set(9, 16, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  // light from the open door at dusk / night
  const warm = new THREE.PointLight(0xFFB85C, 0, 9, 2);
  scene.add(warm);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  /** v = dusk amount (finale), n = night amount; both 0..1. */
  function apply(v: number, n: number, h: House | undefined): void {
    hemi.color.copy(ENV.day.hc).lerp(ENV.dusk.hc, v).lerp(ENV.night.hc, n);
    hemi.intensity = LEGACY * lerp(lerp(ENV.day.hi, ENV.dusk.hi, v), ENV.night.hi, n);
    sun.color.copy(ENV.day.sc).lerp(ENV.dusk.sc, v).lerp(ENV.night.sc, n);
    sun.intensity = LEGACY * lerp(lerp(ENV.day.si, ENV.dusk.si, v), ENV.night.si, n);
    mat.glass.emissiveIntensity = Math.max(1.25 * v, 1.05 * n);
    mat.lamp.emissiveIntensity = 1.4 * Math.max(v, n);
    const doorOn = !!h && h.doorPiece.obj.visible;
    warm.intensity = doorOn ? LEGACY * WARM_FALLOFF * 1.6 * Math.max(v, 0.75 * n) : 0;
    if (h) warm.position.copy(h.warmPos);
    bpMat.opacity = 0.5 * (1 - v) * (1 - 0.4 * n);
  }

  /** Shadow coverage; the city is much bigger than a building site. */
  function setExtent(e: number): void {
    Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e, far: 50 + 3 * e });
    sun.position.set(9, 16, 7).multiplyScalar(Math.max(1, e / 12));
    sun.shadow.camera.updateProjectionMatrix();
  }

  return { apply, setExtent };
}
