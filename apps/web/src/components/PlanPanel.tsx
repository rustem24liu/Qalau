import { fmtDur, piecesPerTask, TASK_SIZES } from "@qalau/core";
import { scene } from "../lib/scene";
import { useActiveGoal } from "../store";
import { AddTaskForm } from "./AddTaskForm";
import { GoalHeader } from "./GoalHeader";
import { NeglectNote } from "./NeglectNote";
import { DailyNote, GoalTypeSwitch } from "./GoalTypeSwitch";
import { TaskList } from "./TaskList";

/** Right column: the goal's plan — title, size, tasks. */
export function PlanPanel() {
  const goal = useActiveGoal();
  const N = scene.pieceCount(goal.type);
  const total = goal.tasks.length;
  const spentAll = goal.tasks.reduce((a, t) => a + (t.spent || 0), 0);
  const hint =
    (total
      ? `Задача ${TASK_SIZES.map(size => `${size} ≈ ${piecesPerTask(goal, N, { id: "", text: "", done: false, size })}`).join(", ")} деталей · всего ${N}`
      : `Добавьте первую задачу · в постройке ${N} деталей`) +
    (spentAll ? ` · потрачено ${fmtDur(spentAll)}` : "");

  return (
    <div className="plan">
      <GoalHeader key={goal.id} goal={goal} />
      <NeglectNote goal={goal} />
      <GoalTypeSwitch goal={goal} />
      <DailyNote goal={goal} />
      <div>
        <div className="tasks-head">
          <div className="lbl">Задачи — кирпичики</div>
        </div>
        <TaskList key={goal.id} goal={goal} />
      </div>
      <AddTaskForm />
      <div className="foot"><span className="hint">{hint}</span></div>
    </div>
  );
}
