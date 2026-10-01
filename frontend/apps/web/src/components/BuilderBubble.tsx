import { fmtClock, REST_FOR, REST_PRESETS, restLeft, TIRED_AFTER } from "@qalau/core";
import { useEffect, useRef, useState } from "react";
import { scene } from "../lib/scene";
import { useStore } from "../store";

export type BubbleMode = "tired" | "rest" | "cheer" | null;

/** Speech cloud that follows the main builder's head. */
export function BuilderBubble({ mode }: { mode: BubbleMode }) {
  const el = useRef<HTMLDivElement>(null);
  const rest = useStore(s => s.state.rest);
  const now = useStore(s => s.now);
  const { startRest, snoozeRest } = useStore.getState();

  // follow the head every frame; the 2D scene has no builder, so the cloud stays at its CSS spot
  useEffect(() => {
    if (!mode) return;
    let raf = 0;
    const loop = () => {
      const a = scene.headAnchor(), b = el.current, box = b?.parentElement;
      if (a && b && box) {
        // keep the whole cloud inside the sky box
        const W = box.clientWidth, H = box.clientHeight, w = b.offsetWidth, h = b.offsetHeight;
        b.style.left = Math.min(W - w / 2 - 8, Math.max(w / 2 + 8, a.x * W)) + "px";
        b.style.top = Math.min(H - 8, Math.max(h + 22, a.y * H)) + "px";
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  if (!mode) return null;
  const min = (ms: number) => Math.round(ms / 60000);
  return (
    <div ref={el} className={"bubble " + mode} role={mode === "tired" ? "alertdialog" : "status"}>
      {mode === "tired" && (
        <>
          <p>Уф, работаю уже {min(TIRED_AFTER)} минут без перерыва. Отдохнём?</p>
          <div className="bubble-btns">
            {REST_PRESETS.slice(0, 3).map(m => (
              <button key={m} className={"btn" + (m === min(REST_FOR) ? "" : " soft")} type="button" onClick={() => startRest(m)}>{m} мин</button>
            ))}
            <button className="btn ghost" type="button" onClick={snoozeRest}>Позже</button>
          </div>
        </>
      )}
      {mode === "rest" && rest && <p>Z<small>z</small><small>z</small>… отдыхаю, ещё {fmtClock(restLeft(rest, now))}</p>}
      {mode === "cheer" && <p>Полон сил! Продолжаем стройку</p>}
    </div>
  );
}

/** "cheer" for a few seconds after each finished break. */
export function useCheer(): boolean {
  const cheer = useStore(s => s.cheer);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!cheer) return;
    setOn(true);
    const id = setTimeout(() => setOn(false), 4000);
    return () => clearTimeout(id);
  }, [cheer]);
  return on;
}
