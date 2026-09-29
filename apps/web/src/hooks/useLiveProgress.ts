import { liveCount, type Goal } from "@qalau/core";
import { scene } from "../lib/scene";
import { useStore } from "../store";

/** Pieces built for the goal, including what running timers have added. */
export function useLiveProgress(g: Goal) {
  const timers = useStore(s => s.state.timers);
  const now = useStore(s => s.now);
  const N = scene.pieceCount(g.type);
  return { N, k: liveCount(g, N, timers, now) };
}
