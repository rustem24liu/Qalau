import { exampleState, normalize, rollDaily } from "./goals";
import type { AppState } from "./types";

const KEY = "stroyka-v1";

export function loadState(): AppState {
  let state: AppState | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
  if (!state || !Array.isArray(state.goals)) state = exampleState();
  normalize(state);
  rollDaily(state);
  return state;
}

export function saveState(state: AppState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
