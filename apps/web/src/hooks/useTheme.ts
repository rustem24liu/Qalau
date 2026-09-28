import { useEffect, useLayoutEffect, useState } from "react";

type Pref = "light" | "dark" | null;

const KEY = "stroyka-theme";
const mq = matchMedia("(prefers-color-scheme: dark)");

function readPref(): Pref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null;
  }
}

const resolve = (pref: Pref, systemDark: boolean) => pref === "dark" || (pref !== "light" && systemDark);

/** Night right now — for code that runs outside React. */
export const prefersNight = () => resolve(readPref(), mq.matches);

/** Day / night: saved choice, otherwise follows the system. */
export function useTheme() {
  const [pref, setPref] = useState(readPref);
  const [systemDark, setSystemDark] = useState(mq.matches);

  useEffect(() => {
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (pref) root.setAttribute("data-theme", pref);
    else root.removeAttribute("data-theme");
  }, [pref]);

  const night = resolve(pref, systemDark);
  const toggle = () => {
    const next = night ? "light" : "dark";
    setPref(next);
    try { localStorage.setItem(KEY, next); } catch {}
  };
  return { night, toggle };
}
