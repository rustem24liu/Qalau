import { isExpired, restLeft } from "@qalau/core";
import { useEffect } from "react";
import { useStore } from "../store";

/** Drives running timers and breaks: redraws 4×/s, finishes expired countdowns and breaks. */
export function useTimerTick(): void {
  const running = useStore(s => s.state.timers.length > 0 || !!s.state.rest);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { state, tick, finishTimer, endRest } = useStore.getState();
      if (state.rest && restLeft(state.rest) === 0) return endRest();
      const expired = state.timers.filter(tm => isExpired(tm));
      if (expired.length) expired.forEach(tm => finishTimer(tm.taskId, false));
      else tick();
    }, 250);
    return () => clearInterval(id);
  }, [running]);
}
