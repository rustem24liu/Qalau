import { createScene } from "@qalau/scene";
import { prefersNight } from "../hooks/useTheme";

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** One scene for the whole app: the main view and the goal thumbnails share it. */
export const scene = createScene({ night: prefersNight(), reducedMotion });
