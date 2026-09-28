import { liveCount, type Goal } from "@qalau/core";
import { scene } from "../lib/scene";
import { useStore } from "../store";

/** Pieces built for the goal, including what a running timer has added. */
export function useLiveProgress(g: Goal) {
  const timer = useStore(s => s.state.timer);
  const now = useStore(s => s.now);
  const N = scene.pieceCount(g.type);
  return { N, k: liveCount(g, N, timer, now) };
}
