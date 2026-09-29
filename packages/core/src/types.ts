export type GoalType = "big" | "medium" | "daily";

export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  text: string;
  done: boolean;
  priority?: Priority;
  /** Time spent via timer / stopwatch, ms. */
  spent?: number;
}

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  tasks: Task[];
  // daily goals only
  day?: string;
  built?: number;
  streak?: number;
  lastBuilt?: string;
}

interface TimerBase {
  goalId: string;
  taskId: string;
  /** Epoch ms when the (possibly resumed) run started. */
  start: number;
  /** Elapsed ms frozen at pause, or null while running. */
  paused: number | null;
}

/** "up" = stopwatch, "down" = countdown of `dur` ms. */
export type Timer = (TimerBase & { mode: "up" }) | (TimerBase & { mode: "down"; dur: number });

/** Continuous work time — drives the builder's fatigue. */
export interface WorkLog {
  /** Worked ms banked before the current stretch. */
  acc: number;
  /** Epoch ms when the current stretch began, or null while nothing runs. */
  from: number | null;
  /** When work last stopped — a long enough gap counts as rest. */
  stoppedAt: number | null;
  /** Worked ms after which the builder asks for a break. */
  promptAt: number;
}

/** A break: all running tasks are paused and resumed when it ends. */
export interface Rest {
  start: number;
  dur: number;
  /** Tasks that were running when the break began. */
  resume: string[];
}

import type { City } from "./city";

export interface AppState {
  goals: Goal[];
  activeId?: string;
  /** True until the user changes anything in the example data. */
  example?: boolean;
  /** Running tasks, at most MAX_PARALLEL, across all goals. */
  timers: Timer[];
  work: WorkLog;
  rest?: Rest | null;
  /** The user's home city; asked the first time the city view opens. */
  city?: City | null;
  /** @deprecated single timer from before parallel tasks; migrated by normalize(). */
  timer?: Timer | null;
}
