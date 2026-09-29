import { KINDS, type Goal } from "@qalau/core";
import { useEffect, useRef } from "react";
import { scene } from "../lib/scene";
import { BuilderBubble, type BubbleMode } from "./BuilderBubble";
import { Toast } from "./Toast";
import { WeatherFx, WeatherSky } from "./Weather";

interface Props {
  goal: Goal;
  k: number;
  N: number;
  night: boolean;
  /** Builders hammering: one per running timer of this goal. */
  workers: number;
  /** Builder's fatigue state, shown as a speech cloud. */
  mood: BubbleMode;
}

/** The "sky" box hosting the 3D (or SVG) building. */
export function SceneView({ goal, k, N, night, workers, mood }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => scene.mount(host.current!), []);
  useEffect(() => scene.show(goal.id, goal.type, k), [goal.id, goal.type, k]);
  useEffect(() => scene.setWorkers(workers), [workers]);
  useEffect(() => scene.setNight(night), [night]);
  useEffect(() => scene.setMood(mood ?? "normal"), [mood]);

  const dusk = k >= N && !night;
  return (
    <div className={"sky" + (dusk ? " dusk" : "")}>
      <WeatherSky />
      <div ref={host} className="scene-host" />
      <WeatherFx />
      <BuilderBubble mode={mood} />
      <span className="type-badge">{KINDS[goal.type].house}</span>
      {scene.is3D && <span className="rot-hint">Потяните, чтобы повернуть</span>}
      <Toast />
    </div>
  );
}
