import { REST_FOR, REST_PRESETS } from "@qalau/core";
import { useState } from "react";
import { useStore } from "../store";

const DEFAULT = Math.round(REST_FOR / 60000);

/** "Take a break" at any time, with a chosen length. */
export function RestLauncher() {
  const startRest = useStore(s => s.startRest);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState(String(DEFAULT));

  const go = (m: number) => { setOpen(false); startRest(m); };

  if (!open) {
    return (
      <div className="site-actions">
        <button className="btn ghost" type="button" onClick={() => setOpen(true)}>☕ Сделать перерыв</button>
      </div>
    );
  }
  return (
    <div className="picker rest-picker">
      <span className="unit">Перерыв на</span>
      {REST_PRESETS.map(m => (
        <button key={m} type="button" className={"chip" + (String(m) === raw ? " on" : "")} onClick={() => go(m)}>{m} мин</button>
      ))}
      <input type="number" min={1} max={120} aria-label="Минуты перерыва" value={raw} onChange={e => setRaw(e.target.value)} />
      <span className="unit">мин</span>
      <button className="btn" type="button" onClick={() => go(Math.max(1, Math.min(120, parseInt(raw, 10) || DEFAULT)))}>Отдыхать</button>
      <button className="btn ghost" type="button" onClick={() => setOpen(false)}>Отмена</button>
    </div>
  );
}
