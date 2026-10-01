import { useEffect } from "react";
import { useStore } from "../store";

/** Daily goals reset when the app comes back to the foreground on a new day. */
export function useDailyRollover(): void {
  useEffect(() => {
    const on = () => { if (document.visibilityState === "visible") useStore.getState().rollDay(); };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
}
