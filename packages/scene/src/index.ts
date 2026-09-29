import { createScene2D } from "./scene2d";
import { createScene3D } from "./scene3d";
import type { SceneApi, SceneOptions } from "./types";

export type { CityLot, CityView, Mood, SceneApi, SceneOptions, Thumb } from "./types";

/** 3D scene if WebGL works, SVG fallback otherwise. */
export const createScene = (opts: SceneOptions): SceneApi => createScene3D(opts) ?? createScene2D();
