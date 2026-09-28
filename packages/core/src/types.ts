export type GoalType = "big" | "medium" | "daily";

export interface Task {
  id: string;
  text: string;
  done: boolean;
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

export interface AppState {
  goals: Goal[];
  activeId?: string;
  /** True until the user changes anything in the example data. */
  example?: boolean;
  timer?: Timer | null;
}
