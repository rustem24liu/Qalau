import { isExpired } from "@qalau/core";
import { useEffect } from "react";
import { useStore } from "../store";

/** Drives the running timer: redraws 4×/s and finishes an expired countdown. */
export function useTimerTick(): void {
  const running = useStore(s => !!s.state.timer);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { state, tick, finishTimer } = useStore.getState();
      if (state.timer && isExpired(state.timer)) finishTimer(false);
      else tick();
    }, 250);
    return () => clearInterval(id);
  }, [running]);
}
