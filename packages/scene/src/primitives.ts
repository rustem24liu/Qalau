import * as THREE from "three";

/** Box / low-poly blob factories; box geometries are shared by size. */
export function createPrimitives() {
  const geos = new Map<string, THREE.BoxGeometry>();

  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx?: number) => {
    const k = w + "_" + h + "_" + d;
    let g = geos.get(k);
    if (!g) geos.set(k, (g = new THREE.BoxGeometry(w, h, d)));
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    if (rx) mesh.rotation.x = rx;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const blob = (r: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  return { box, blob };
}

export type Primitives = ReturnType<typeof createPrimitives>;
