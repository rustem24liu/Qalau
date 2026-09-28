import { fmtDur } from "@qalau/core";
import { scene } from "../lib/scene";
import { useActiveGoal } from "../store";
import { AddTaskForm } from "./AddTaskForm";
import { GoalHeader } from "./GoalHeader";
import { DailyNote, GoalTypeSwitch } from "./GoalTypeSwitch";
import { TaskList } from "./TaskList";

/** Right column: the goal's plan — title, size, tasks. */
export function PlanPanel() {
  const goal = useActiveGoal();
  const N = scene.pieceCount(goal.type);
  const total = goal.tasks.length;
  const spentAll = goal.tasks.reduce((a, t) => a + (t.spent || 0), 0);
  const hint =
    (total ? `Одна задача ≈ ${Math.round(N / total)} деталей · всего в постройке ${N} деталей` : `Добавьте первую задачу · в постройке ${N} деталей`) +
    (spentAll ? ` · потрачено ${fmtDur(spentAll)}` : "");

  return (
    <div className="plan">
      <GoalHeader key={goal.id} goal={goal} />
      <GoalTypeSwitch goal={goal} />
      <DailyNote goal={goal} />
      <div>
        <div className="lbl">Задачи — кирпичики</div>
        <TaskList key={goal.id} goal={goal} />
      </div>
      <AddTaskForm />
      <div className="foot"><span className="hint">{hint}</span></div>
    </div>
  );
}
