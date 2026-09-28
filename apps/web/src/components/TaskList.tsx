import { fmtDur, type Goal, type Task, type Timer } from "@qalau/core";
import { useState } from "react";
import { ensureAudio } from "../lib/audio";
import { useStore } from "../store";
import { ClockIcon, PlayIcon } from "./icons";

const PRESETS = [1, 15, 25, 45, 60];

export function TaskList({ goal }: { goal: Goal }) {
  const timer = useStore(s => s.state.timer);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(25);

  if (!goal.tasks.length) {
    return <ul className="tasks"><li className="empty">Пока нет задач. Разбейте цель на шаги — чем их больше, тем мельче кирпичи.</li></ul>;
  }
  return (
    <ul className="tasks">
      {goal.tasks.map(t => (
        <TaskItem
          key={t.id}
          task={t}
          timer={timer}
          picking={pickFor === t.id && !t.done && !timer}
          onTogglePicker={() => setPickFor(p => (p === t.id ? null : t.id))}
          minutes={minutes}
          setMinutes={setMinutes}
          onStarted={() => setPickFor(null)}
        />
      ))}
    </ul>
  );
}

interface ItemProps {
  task: Task;
  timer: Timer | null | undefined;
  picking: boolean;
  onTogglePicker(): void;
  minutes: number;
  setMinutes(m: number): void;
  onStarted(): void;
}

function TaskItem({ task: t, timer, picking, onTogglePicker, minutes, setMinutes, onStarted }: ItemProps) {
  const { toggleTask, removeTask, startStopwatch } = useStore.getState();
  const running = timer?.taskId === t.id;
  const busy = !!timer;

  let side;
  if (t.done) side = t.spent ? <span className="spent" title="Затраченное время">{fmtDur(t.spent)}</span> : <span />;
  else if (running) side = <span className="run-tag">{timer.mode === "up" ? "в работе" : "таймер"}</span>;
  else {
    const dis = busy ? { disabled: true, title: "Сначала завершите текущую задачу" } : {};
    side = (
      <span className="tbtns">
        <button className="tbtn" type="button" {...dis} aria-label="Начать с секундомером" onClick={() => { onStarted(); ensureAudio(); startStopwatch(t.id); }}>
          <PlayIcon />Начать
        </button>
        <button className="tbtn" type="button" {...dis} aria-label="Поставить таймер" onClick={onTogglePicker}>
          <ClockIcon />Таймер
        </button>
      </span>
    );
  }

  return (
    <li className={"task" + (t.done ? " is-done" : "") + (running ? " is-timed" : "")}>
      <input type="checkbox" id={"t-" + t.id} checked={t.done} onChange={e => toggleTask(t.id, e.target.checked)} />
      <label htmlFor={"t-" + t.id}>{t.text}</label>
      {side}
      <button className="del" type="button" aria-label="Удалить задачу" onClick={() => removeTask(t.id)}>×</button>
      {picking && <TimerPicker taskId={t.id} minutes={minutes} setMinutes={setMinutes} onStarted={onStarted} />}
    </li>
  );
}

function TimerPicker({ taskId, minutes, setMinutes, onStarted }: { taskId: string; minutes: number; setMinutes(m: number): void; onStarted(): void }) {
  const startCountdown = useStore(s => s.startCountdown);
  const [raw, setRaw] = useState(String(minutes));

  const pick = (m: number) => { setMinutes(m); setRaw(String(m)); };
  const start = () => {
    const m = Math.max(1, Math.min(240, parseInt(raw, 10) || minutes));
    setMinutes(m);
    onStarted();
    ensureAudio();
    startCountdown(taskId, m);
  };

  return (
    <div className="picker">
      {PRESETS.map(m => (
        <button key={m} type="button" className={"chip" + (String(m) === raw ? " on" : "")} onClick={() => pick(m)}>{m} мин</button>
      ))}
      <input
        type="number" min={1} max={240} aria-label="Минуты" value={raw}
        onChange={e => { setRaw(e.target.value); const v = parseInt(e.target.value, 10); if (v > 0) setMinutes(v); }}
      />
      <span className="unit">мин</span>
      <button className="btn" type="button" onClick={start}>Старт стройки</button>
    </div>
  );
}
