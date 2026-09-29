import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { fmtDur, MAX_PARALLEL, type Goal, type Task, type Timer } from "@qalau/core";
import { useState } from "react";
import { ensureAudio } from "../lib/audio";
import { useStore } from "../store";
import { ClockIcon, GripIcon, PlayIcon } from "./icons";
import { PriorityPicker } from "./PriorityPicker";
import { DuePicker } from "./DuePicker";
import { SizeToggle } from "./SizeToggle";

const PRESETS = [1, 15, 25, 45, 60];

export function TaskList({ goal }: { goal: Goal }) {
  const timers = useStore(s => s.state.timers);
  const full = timers.length >= MAX_PARALLEL;
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(25);
  const moveTask = useStore(s => s.moveTask);
  const sensors = useSensors(
    // a small move threshold keeps taps on the handle from starting a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    moveTask(String(active.id), goal.tasks.findIndex(t => t.id === over.id));
  };

  if (!goal.tasks.length) {
    return <ul className="tasks"><li className="empty">Пока нет задач. Разбейте цель на шаги — чем их больше, тем мельче кирпичи.</li></ul>;
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onDragEnd} accessibility={{ screenReaderInstructions: { draggable: "Нажмите пробел, чтобы взять задачу, стрелками переместите, пробелом отпустите." } }}>
    <SortableContext items={goal.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
    <ul className="tasks">
      {goal.tasks.map(t => (
        <TaskItem
          key={t.id}
          task={t}
          timer={timers.find(tm => tm.taskId === t.id)}
          full={full}
          picking={pickFor === t.id && !t.done && !full}
          onTogglePicker={() => setPickFor(p => (p === t.id ? null : t.id))}
          minutes={minutes}
          setMinutes={setMinutes}
          onStarted={() => setPickFor(null)}
        />
      ))}
      {full && <li className="limit-note">В работе уже {MAX_PARALLEL} задачи — больше параллельно только снижает фокус. Закончите одну, чтобы начать следующую.</li>}
    </ul>
    </SortableContext>
    </DndContext>
  );
}

interface ItemProps {
  task: Task;
  /** This task's timer, if it runs. */
  timer: Timer | undefined;
  /** MAX_PARALLEL tasks already run. */
  full: boolean;
  picking: boolean;
  onTogglePicker(): void;
  minutes: number;
  setMinutes(m: number): void;
  onStarted(): void;
}

function TaskItem({ task: t, timer, full, picking, onTogglePicker, minutes, setMinutes, onStarted }: ItemProps) {
  const { toggleTask, removeTask, startStopwatch } = useStore.getState();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Translate.toString(transform), transition };

  let side;
  if (t.done) side = t.spent ? <span className="spent" title="Затраченное время">{fmtDur(t.spent)}</span> : <span />;
  else if (timer) side = <span className="run-tag">{timer.mode === "up" ? "в работе" : "таймер"}</span>;
  else {
    const dis = full ? { disabled: true, title: `Одновременно — не больше ${MAX_PARALLEL} задач` } : {};
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
    <li ref={setNodeRef} style={style} className={"task" + (t.done ? " is-done" : "") + (timer ? " is-timed" : "") + (isDragging ? " is-dragging" : "") + (t.priority && !t.done ? " p-" + t.priority : "")}>
      <button ref={setActivatorNodeRef} className="grip" type="button" aria-label={`Переместить «${t.text}»`} title="Перетащите, чтобы поменять порядок" {...attributes} {...listeners}>
        <GripIcon />
      </button>
      <input type="checkbox" id={"t-" + t.id} checked={t.done} onChange={e => toggleTask(t.id, e.target.checked)} />
      <span className="task-main">
        <label htmlFor={"t-" + t.id}>{t.text}</label>
        {!t.done && <SizeToggle task={t} />}
        {!t.done && <PriorityPicker taskId={t.id} value={t.priority} />}
        {!t.done && <DuePicker due={t.due} of="задачи" onChange={d => useStore.getState().setTaskDue(t.id, d)} />}
      </span>
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
