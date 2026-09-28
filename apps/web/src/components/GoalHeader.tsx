import type { Goal } from "@qalau/core";
import { useState } from "react";
import { useStore } from "../store";
import { TrashIcon } from "./icons";

/** Goal title (editable) and delete-with-confirmation. */
export function GoalHeader({ goal }: { goal: Goal }) {
  const isExample = useStore(s => !!s.state.example);
  const { renameGoal, deleteActiveGoal } = useStore.getState();
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div>
      <div className="plan-top">
        <div className="lbl">Цель {isExample && <span className="tag">пример</span>}</div>
        {confirmDel ? (
          <span className="confirm">
            <span>Удалить «{(goal.title || "цель").slice(0, 24)}»?</span>
            <button className="btn warn" type="button" onClick={() => { setConfirmDel(false); deleteActiveGoal(); }}>Удалить</button>
            <button className="btn ghost" type="button" onClick={() => setConfirmDel(false)}>Отмена</button>
          </span>
        ) : (
          <button className="btn ghost" type="button" onClick={() => setConfirmDel(true)}><TrashIcon />Удалить цель</button>
        )}
      </div>
      <input id="goal-title" aria-label="Название цели" maxLength={80} value={goal.title} onChange={e => renameGoal(e.target.value)} />
    </div>
  );
}
