import type { GoalType } from "@qalau/core";
import type * as THREE from "three";
import type { Materials } from "./materials";

export type Wall = "front" | "back" | "left" | "right";

export interface WindowSpec {
  wall: Wall;
  /** Center along the wall, in bricks. */
  c: number;
  /** Width, in bricks. */
  w: number;
  /** First and last brick row. */
  r: [number, number];
}

export interface HouseConfig {
  /** Footprint, in bricks. */
  W: number;
  D: number;
  rows: number;
  ridge: number;
  tileRows: number;
  /** Island size [x, z]; x has room for the builder's camp right of the house. */
  island: [number, number];
  /** Camera half-height fit: [min, min at aspect 1]. */
  view: [number, number];
  /** Camera target height. */
  ty: number;
  walls: THREE.Material[];
  roof: THREE.Material[];
  gable: THREE.Material;
  door: { c: number; w: number; rows: number };
  wins: WindowSpec[];
  chimney: boolean;
  /** 1..3 — how lush the garden is. */
  garden: number;
  flag: boolean;
}

export const houseConfigs = (mat: Materials): Record<GoalType, HouseConfig> => ({
  big: {
    W: 8, D: 6, rows: 6, ridge: 2.0, tileRows: 5, island: [18.2, 13.4], view: [9.0, 12.6], ty: 2.1,
    walls: [mat.brick, mat.brick2, mat.brick3], roof: [mat.roof, mat.roof2], gable: mat.plaster,
    door: { c: 0, w: 2, rows: 4 },
    wins: [
      { wall: "front", c: -2.5, w: 1, r: [2, 3] }, { wall: "front", c: 2.5, w: 1, r: [2, 3] },
      { wall: "right", c: 0, w: 1, r: [2, 3] }, { wall: "left", c: 0, w: 1, r: [2, 3] }, { wall: "back", c: 0, w: 2, r: [2, 3] },
    ],
    chimney: true, garden: 3, flag: true,
  },
  medium: {
    W: 6, D: 4, rows: 5, ridge: 1.6, tileRows: 4, island: [15.4, 11.2], view: [7.7, 10.7], ty: 1.7,
    walls: [mat.sand, mat.sand2, mat.sand3], roof: [mat.teal, mat.teal2], gable: mat.plaster,
    door: { c: -1.5, w: 1, rows: 4 },
    wins: [
      { wall: "front", c: 1, w: 2, r: [2, 3] }, { wall: "right", c: 0, w: 1, r: [2, 3] },
      { wall: "left", c: 0, w: 1, r: [2, 3] }, { wall: "back", c: 0, w: 2, r: [2, 3] },
    ],
    chimney: true, garden: 2, flag: true,
  },
  daily: {
    W: 5, D: 4, rows: 4, ridge: 1.4, tileRows: 3, island: [13.4, 10.0], view: [6.7, 9.3], ty: 1.2,
    walls: [mat.wood, mat.wood2, mat.wood3], roof: [mat.shingle, mat.shingle2], gable: mat.wood2,
    door: { c: 0, w: 1, rows: 3 },
    wins: [{ wall: "right", c: 0, w: 1, r: [1, 2] }, { wall: "left", c: 0, w: 1, r: [1, 2] }],
    chimney: false, garden: 1, flag: false,
  },
});
