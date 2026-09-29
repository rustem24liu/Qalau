import type { GoalType } from "@qalau/core";
import type { Mood } from "./builder";

export type { Mood };

export type Thumb = { kind: "img"; src: string } | { kind: "svg"; markup: string };

/** What the UI needs from a scene, whether 3D (three.js) or the 2D SVG fallback. */
export interface SceneApi {
  readonly is3D: boolean;
  /** Total pieces in the building of this goal type. */
  pieceCount(type: GoalType): number;
  /** Stage index (see STAGES) of piece i. */
  stageOf(type: GoalType, i: number): number;
  /** Stage indices that this building type actually has. */
  stages(type: GoalType): number[];
  /** Attaches the scene to a DOM element; returns a detach function. */
  mount(host: HTMLElement): () => void;
  /** Shows goal `goalId` with the first k pieces built (animates growth within the same goal). */
  show(goalId: string, type: GoalType, k: number): void;
  setNight(on: boolean): void;
  /** Number of builders hammering — one per running timer. The main builder idles at 0. */
  setWorkers(n: number): void;
  /** Main builder's state: tired after long work, resting on a break, cheering after it. */
  setMood(mood: Mood): void;
  /** Main builder's head in host coordinates (0..1), for the speech bubble; null if unknown. */
  headAnchor(): { x: number; y: number } | null;
  /** Static preview for the goal list, lit for day or night. */
  thumb(type: GoalType, k: number, night: boolean): Thumb | null;
}

export interface SceneOptions {
  night: boolean;
  reducedMotion: boolean;
}
