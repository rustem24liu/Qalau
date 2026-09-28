import { FINAL_STAGE, STAGES, type Goal, type Timer } from "@qalau/core";
import { scene } from "../lib/scene";

interface Props {
  goal: Goal;
  k: number;
  N: number;
  timer: Timer | null | undefined;
}

/** Stage title, counters, progress bar and the list of stages. */
export function ProgressMeter({ goal: g, k, N, timer }: Props) {
  const done = g.tasks.filter(t => t.done).length;
  const finished = k >= N;
  const cur = finished ? FINAL_STAGE : scene.stageOf(g.type, k);
  const here = timer?.goalId === g.id;

  const title = finished
    ? g.type === "daily" ? "Хижина готова на сегодня" : "Построено! С новосельем"
    : (here ? (timer.paused != null ? "Стройка на паузе · " : "Строим: ") : "Этап: ") + STAGES[cur];

  return (
    <>
      <div className="meter">
        <div className="meter-row">
          <span className="stage">{title}</span>
          <span className="count">{done}/{g.tasks.length} задач · {k}/{N} деталей</span>
        </div>
        <div className="bar"><i style={{ width: (k / N) * 100 + "%" }} /></div>
      </div>
      <ul className="stages">
        {scene.stages(g.type).map(i => (
          <li key={i} className={finished || i < cur ? "done" : i === cur ? "now" : ""}>{STAGES[i]}</li>
        ))}
      </ul>
    </>
  );
}
