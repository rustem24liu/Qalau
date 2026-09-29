import * as THREE from "three";

const M = (color: number, o?: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true, ...o });

export function createMaterials() {
  return {
    brick: M(0xC2653F), brick2: M(0xB05538), brick3: M(0xCC7651),
    sand: M(0xD9B48A), sand2: M(0xCFA77B), sand3: M(0xE1BF97),
    wood: M(0xB78455), wood2: M(0xA7764A), wood3: M(0xC39463),
    found: M(0x8F9398), plaster: M(0xEADFCD), frame: M(0xF5F0E7),
    glass: M(0x8DBBD6, { roughness: 0.25, emissive: 0xFFC158, emissiveIntensity: 0 }),
    door: M(0x7A4E30), knob: M(0xE3B44B, { metalness: 0.4, roughness: 0.45 }),
    roof: M(0x4B5C6E), roof2: M(0x58697C), ridge: M(0x3C4958),
    teal: M(0x3F6E6B), teal2: M(0x4B7D79),
    shingle: M(0x6E5845), shingle2: M(0x7E6750),
    chim: M(0x9C4A32), cap: M(0x5B5F66),
    grass: M(0x7FA85A), grass2: M(0x71994D), dirt: M(0x8B6A4A), dirt2: M(0x735638),
    leaf: M(0x5F9B49), leaf2: M(0x77B057), trunk: M(0x6E4E35), stone: M(0xD2CABB),
    smoke: M(0xF1F3F5, { transparent: true, opacity: 0.82 }),
    fl1: M(0xE8A33D), fl2: M(0xE06A7C), fl3: M(0xF3EEE0),
    flag: M(0xE3A12F), gold: M(0xE8B53A, { metalness: 0.55, roughness: 0.3, emissive: 0x6B4A10, emissiveIntensity: 0.35 }), white: M(0xF2F2EE), steel2: M(0xB8C0C8), road: M(0x6E747B), paving: M(0xB9B0A0), snow: M(0xF4F6F8), rock: M(0x8A8F96), lamp: M(0xFFE0A0, { emissive: 0xFFC158, emissiveIntensity: 0 }),
    conBody: M(0x5B6470), conPanel: M(0x3E4550),
    conBtn: M(0xE0413A, { emissive: 0x8A1A12, emissiveIntensity: 0.25, roughness: 0.5 }),
    conLight: M(0x9BE36A, { emissive: 0x7DDC4A, emissiveIntensity: 0.2 }),
    // builder
    skin: M(0xE7B58A), vest: M(0xEF8424), vestBlue: M(0x2F86D6), vestGreen: M(0x3E9E55), stripe: M(0xF6F2E4), pants: M(0x2F5B86),
    boot: M(0x3A302A), hat: M(0xF3C12C), eye: M(0x262626), handle: M(0x7A5534),
    steel: M(0x9AA0A8, { metalness: 0.5, roughness: 0.4 }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;

export const createBlueprintMaterial = () =>
  new THREE.LineBasicMaterial({ color: 0x6F97BD, transparent: true, opacity: 0.5 });
