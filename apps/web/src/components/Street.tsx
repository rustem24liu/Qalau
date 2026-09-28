import { builtCount, KINDS, type Goal, type GoalType } from "@qalau/core";
import { useState } from "react";
import { scene } from "../lib/scene";
import { useActiveGoal, useStore } from "../store";

/** Horizontal list of goals with thumbnails, plus the "new goal" chooser. */
export function Street({ night }: { night: boolean }) {
  const goals = useStore(s => s.state.goals);
  const active = useActiveGoal();
  const selectGoal = useStore(s => s.selectGoal);
  const addGoal = useStore(s => s.addGoal);
  const [choosing, setChoosing] = useState(false);

  const create = (type: GoalType) => {
    setChoosing(false);
    addGoal(type);
    requestAnimationFrame(() => {
      const t = document.getElementById("goal-title") as HTMLInputElement | null;
      t?.focus();
      t?.select();
    });
  };

  return (
    <nav className="street" aria-label="Ваши цели">
      {goals.map(g => (
        <Lot key={g.id} goal={g} night={night} pressed={g.id === active.id} onClick={() => selectGoal(g.id)} />
      ))}
      {choosing ? (
        <div className="chooser">
          <div className="lbl">Какая цель?</div>
          <ChooseButton title="Большая — дом" note="проект на месяцы" onClick={() => create("big")} />
          <ChooseButton title="Средняя — коттедж" note="задача на недели" onClick={() => create("medium")} />
          <ChooseButton title="Ежедневная — хижина" note="галочки сбрасываются каждый день" onClick={() => create("daily")} />
          <button type="button" className="x" onClick={() => setChoosing(false)}>Отмена</button>
        </div>
      ) : (
        <button className="lot new" type="button" onClick={() => setChoosing(true)}>
          <div><span>+</span><br />Новая цель</div>
        </button>
      )}
    </nav>
  );
}

function Lot({ goal: g, night, pressed, onClick }: { goal: Goal; night: boolean; pressed: boolean; onClick(): void }) {
  const k = builtCount(g, scene.pieceCount(g.type));
  const thumb = scene.thumb(g.type, k, night);
  const done = g.tasks.filter(t => t.done).length;
  return (
    <button className="lot" type="button" aria-pressed={pressed} onClick={onClick}>
      <span className="th">
        {thumb?.kind === "img" && <img src={thumb.src} alt="" />}
        {thumb?.kind === "svg" && <span dangerouslySetInnerHTML={{ __html: thumb.markup }} />}
      </span>
      <span className="nm">{g.title || "Без названия"}</span>
      <span className="pc">
        {KINDS[g.type].house} · {done}/{g.tasks.length}
        {g.type === "daily" && ` · серия ${g.streak || 0}`}
      </span>
    </button>
  );
}

function ChooseButton({ title, note, onClick }: { title: string; note: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick}>
      <b>{title}</b>
      <small>{note}</small>
    </button>
  );
}
