import { elapsed, fmtClock, timerProgress, type Goal, type Timer } from "@qalau/core";
import { useState } from "react";
import { ensureAudio } from "../lib/audio";
import { useStore } from "../store";

/** Running stopwatch / countdown with pause, finish and cancel. */
export function TimerBox({ timer: tm, activeGoal }: { timer: Timer; activeGoal: Goal }) {
  const goals = useStore(s => s.state.goals);
  const now = useStore(s => s.now);
  const { togglePause, finishTimer, cancelTimer, selectGoal } = useStore.getState();
  const [confirmStop, setConfirmStop] = useState(false);

  const goal = goals.find(g => g.id === tm.goalId);
  const task = goal?.tasks.find(t => t.id === tm.taskId);
  const other = goal && goal.id !== activeGoal.id;
  const up = tm.mode === "up";
  const el = elapsed(tm, now);
  const pct = up ? (timerProgress(tm, now) / 0.9) * 100 : Math.min(100, (el / tm.dur) * 100);

  return (
    <div className="timer">
      <div className="tm-l">
        <div className="lbl">{up ? "Секундомер · делаем задачу" : "Таймер · строим задачу"}</div>
        <div className="tm-task">{task?.text}</div>
        {other && (
          <div className="tm-goal" onClick={() => selectGoal(goal.id)}>
            в цели «{goal.title || "Без названия"}» — открыть
          </div>
        )}
      </div>
      <div className="tm-time">{fmtClock(up ? el : tm.dur - el)}</div>
      <div className="tm-bar"><i style={{ width: pct + "%" }} /></div>
      {confirmStop ? (
        <div className="tm-btns">
          <span className="note">Кирпичи этой задачи разберут, время не сохранится. Точно?</span>
          <button className="btn warn" type="button" onClick={cancelTimer}>Остановить</button>
          <button className="btn ghost" type="button" onClick={() => setConfirmStop(false)}>Продолжить стройку</button>
        </div>
      ) : (
        <div className="tm-btns">
          <button className="btn ghost" type="button" onClick={togglePause}>{tm.paused != null ? "Продолжить" : "Пауза"}</button>
          <button className="btn" type="button" onClick={() => { ensureAudio(); finishTimer(true); }}>{up ? "Готово" : "Готово раньше"}</button>
          <button className="btn ghost" type="button" onClick={() => setConfirmStop(true)}>{up ? "Отменить" : "Остановить"}</button>
        </div>
      )}
    </div>
  );
}
