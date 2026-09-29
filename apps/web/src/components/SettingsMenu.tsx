import { DAY_PHASES, PHASE_LABEL, WEATHER_KINDS, WEATHER_LABEL } from "@qalau/core";
import { useEffect, useRef, useState } from "react";
import { useWeatherView } from "../hooks/useWeatherSync";
import { useWeather } from "../lib/weather";
import { DataSettings } from "./DataSettings";
import { CloseIcon, MenuIcon } from "./icons";
import { LocateButton, weatherText } from "./Weather";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Burger button in the header; opens the settings as a centered dialog. */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    btn.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        className="menu-btn"
        type="button"
        aria-label="Настройки"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>
      {open && (
        <div className="menu-backdrop" onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="menu-head">
              <h2 id="settings-title">Настройки</h2>
              <button ref={closeBtn} type="button" className="menu-close" aria-label="Закрыть" onClick={close}>
                <CloseIcon />
              </button>
            </div>
            <WeatherSettings />
            <DataSettings />
          </div>
        </div>
      )}
    </>
  );
}

function WeatherSettings() {
  const mode = useWeather(s => s.mode);
  const manual = useWeather(s => s.manual);
  const setMode = useWeather(s => s.setMode);
  const setManual = useWeather(s => s.setManual);

  return (
    <section className="menu-sec">
      <h3>Погода</h3>
      <div className="seg seg-2" role="radiogroup" aria-label="Откуда брать погоду">
        <button type="button" role="radio" aria-checked={mode === "auto"} onClick={() => setMode("auto")}>
          <b>Автоматически</b>
          <small>по местоположению</small>
        </button>
        <button type="button" role="radio" aria-checked={mode === "manual"} onClick={() => setMode("manual")}>
          <b>Вручную</b>
          <small>выбрать самому</small>
        </button>
      </div>

      {mode === "auto" ? (
        <AutoStatus />
      ) : (
        <>
          <div className="menu-lbl" id="wx-kind">Погода</div>
          <div className="chips" role="radiogroup" aria-labelledby="wx-kind">
            {WEATHER_KINDS.map(k => (
              <button key={k} type="button" role="radio" aria-checked={manual.kind === k} onClick={() => setManual({ kind: k })}>
                {WEATHER_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="menu-lbl" id="wx-phase">Время суток</div>
          <div className="chips" role="radiogroup" aria-labelledby="wx-phase">
            {DAY_PHASES.map(p => (
              <button key={p} type="button" role="radio" aria-checked={manual.phase === p} onClick={() => setManual({ phase: p })}>
                {cap(PHASE_LABEL[p])}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function AutoStatus() {
  const w = useWeatherView();
  const status = useWeather(s => s.status);
  if (w) {
    return (
      <p className="menu-note">
        Сейчас: <b>{weatherText(w)}</b>
        <br />
        <small>Данные Open-Meteo, обновляются каждые 20 минут</small>
      </p>
    );
  }
  if (status === "denied") {
    return <p className="menu-note">Доступ к геолокации запрещён. Разрешите его в настройках браузера или выберите погоду вручную.</p>;
  }
  return <LocateButton className="menu-action" />;
}
