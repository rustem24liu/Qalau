import { fmtDay, forecast, type Goal } from "@qalau/core";
import { useState } from "react";
import { useStore } from "../store";
import { DuePicker } from "./DuePicker";
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
      {goal.type !== "daily" && <GoalDeadline goal={goal} />}
    </div>
  );
}

/** The goal's deadline and a forecast from the recent pace. */
function GoalDeadline({ goal }: { goal: Goal }) {
  const setGoalDue = useStore(s => s.setGoalDue);
  const state = useStore(s => s.state);
  const f = forecast(state, goal); // computed outside the selector: it returns a new object every time
  let text: string;
  if (!goal.tasks.length) text = "";
  else if (f.left === 0) text = "Все задачи выполнены";
  else if (!f.eta) text = "Прогноз появится, когда закроете первые задачи";
  else text = `При текущем темпе — к ${fmtDay(f.eta)}`;
  const verdict = f.onTrack === true && f.left > 0 ? "успеваете к сроку" : f.onTrack === false ? (f.perWeek ? `к сроку не успеваете: нужно ~${f.perWeek} задач в неделю` : "срок уже прошёл") : "";
  return (
    <div className="goal-due">
      <span className="lbl">Срок</span>
      <DuePicker due={goal.due} of="цели" onChange={setGoalDue} />
      {text && <span className={"forecast" + (f.onTrack === false ? " late" : f.onTrack ? " ok" : "")}>{text}{verdict && ` · ${verdict}`}</span>}
    </div>
  );
}
