import {
  builtCount, CITY_SUGGESTIONS, cityPoints, KINDS, LANDMARK_LABEL, LANDMARK_TASKS, landmarkProgress, type City,
} from "@qalau/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDayPhase } from "../hooks/useWeatherSync";
import { scene } from "../lib/scene";
import { useStore } from "../store";
import { WeatherFx, WeatherSky } from "./Weather";

/** The city screen: asks for the user's city once, then shows it. */
export function CityPanel({ night }: { night: boolean }) {
  const city = useStore(s => s.state.city);
  const [editing, setEditing] = useState(false);
  if (!city || editing) return <CityQuestion current={city?.name} onDone={() => setEditing(false)} />;
  return (
    <section className="main">
      <CityScene night={night} city={city} />
      <CityInfo city={city} onChange={() => setEditing(true)} />
    </section>
  );
}

function CityQuestion({ current, onDone }: { current?: string; onDone(): void }) {
  const setCity = useStore(s => s.setCity);
  const [name, setName] = useState(current ?? "");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const save = (n: string) => { if (setCity(n)) onDone(); };

  return (
    <section className="city-ask">
      <h2>Из какого вы города?</h2>
      <p className="sub">В центре появится его символ. Он будет расти с каждой закрытой задачей, а вокруг встанут дома ваших целей.</p>
      <form className="add" onSubmit={e => { e.preventDefault(); save(name); }}>
        <input ref={input} className="new-task" placeholder="Например, Астана" maxLength={40} value={name} onChange={e => setName(e.target.value)} aria-label="Ваш город" />
        <button className="btn" type="submit" disabled={!name.trim()}>Строить город</button>
      </form>
      <div className="city-chips">
        {CITY_SUGGESTIONS.map(c => <button key={c} type="button" className="chip" onClick={() => save(c)}>{c}</button>)}
      </div>
      {current && <button type="button" className="btn ghost" onClick={onDone}>Отмена</button>}
    </section>
  );
}

function CityScene({ night, city }: { night: boolean; city: City }) {
  const host = useRef<HTMLDivElement>(null);
  const goals = useStore(s => s.state.goals);
  const progress = useStore(s => landmarkProgress(s.state));
  const phase = useDayPhase();
  const dark = night || phase === "night";

  const view = useMemo(() => ({
    landmark: city.landmark,
    progress,
    lots: goals.map(g => ({ id: g.id, type: g.type, k: builtCount(g, scene.pieceCount(g.type)) })),
  }), [city.landmark, progress, goals]);

  useEffect(() => scene.mount(host.current!), []);
  useEffect(() => scene.showCity(view), [view]);
  useEffect(() => scene.setNight(dark), [dark]);

  return (
    <div className="site">
      <div className="sky city-sky">
        <WeatherSky />
        <div ref={host} className="scene-host" />
        <WeatherFx />
        <span className="type-badge">{city.name}</span>
        {scene.is3D && <span className="rot-hint">Потяните, чтобы повернуть</span>}
      </div>
    </div>
  );
}

function CityInfo({ city, onChange }: { city: City; onChange(): void }) {
  const goals = useStore(s => s.state.goals);
  const points = useStore(s => cityPoints(s.state));
  const openGoal = useStore(s => s.openGoal);
  const done = Math.min(points, LANDMARK_TASKS);
  const finished = points >= LANDMARK_TASKS;

  return (
    <div className="plan">
      <div className="plan-top">
        <div>
          <div className="lbl">Ваш город</div>
          <h2 className="city-name">{city.name}</h2>
        </div>
        <button className="btn ghost" type="button" onClick={onChange}>Сменить город</button>
      </div>

      <div className="meter">
        <div className="meter-row">
          <span className="stage">{LANDMARK_LABEL[city.landmark]}{finished ? " построен!" : ""}</span>
          <span className="count">{done}/{LANDMARK_TASKS} задач</span>
        </div>
        <div className="bar"><i style={{ width: (done / LANDMARK_TASKS) * 100 + "%" }} /></div>
        <p className="hint">Растёт от каждой закрытой задачи во всех целях. Ежедневная цель добавляет по одной за каждую построенную хижину.</p>
      </div>

      <div>
        <div className="lbl">Дома · {goals.length}</div>
        <ul className="city-houses">
          {goals.map(g => {
            const N = scene.pieceCount(g.type), k = builtCount(g, N), pct = Math.round((k / N) * 100);
            return (
              <li key={g.id}>
                <button type="button" onClick={() => openGoal(g.id)}>
                  <span className="nm">{g.title || "Без названия"}</span>
                  <span className="pc">{KINDS[g.type].house} · {pct === 100 ? "построен" : `${pct}%`}</span>
                  <span className="mini-bar"><i style={{ width: pct + "%" }} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
