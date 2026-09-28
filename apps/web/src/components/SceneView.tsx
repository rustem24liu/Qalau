import { KINDS, type Goal } from "@qalau/core";
import { useEffect, useRef } from "react";
import { scene } from "../lib/scene";
import { Toast } from "./Toast";

interface Props {
  goal: Goal;
  k: number;
  N: number;
  night: boolean;
  working: boolean;
}

/** The "sky" box hosting the 3D (or SVG) building. */
export function SceneView({ goal, k, N, night, working }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => scene.mount(host.current!), []);
  useEffect(() => scene.show(goal.id, goal.type, k), [goal.id, goal.type, k]);
  useEffect(() => scene.setWorking(working), [working]);
  useEffect(() => scene.setNight(night), [night]);

  const dusk = k >= N && !night;
  return (
    <div className={"sky" + (dusk ? " dusk" : "")}>
      <div ref={host} className="scene-host" />
      <span className="type-badge">{KINDS[goal.type].house}</span>
      {scene.is3D && <span className="rot-hint">Потяните, чтобы повернуть</span>}
      <Toast />
    </div>
  );
}
