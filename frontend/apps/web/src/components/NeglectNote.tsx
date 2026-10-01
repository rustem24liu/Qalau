import { idleDays, neglectOf, type Goal } from "@qalau/core";
import { useStore } from "../store";

/** A soft nudge for a goal nobody has touched in weeks. */
export function NeglectNote({ goal }: { goal: Goal }) {
  const level = useStore(s => neglectOf(s.state, goal));
  const days = useStore(s => idleDays(s.state, goal));
  const touchGoal = useStore(s => s.touchGoal);
  if (!level) return null;
  return (
    <div className={"neglect-note n" + level}>
      <p>
        <b>{level === 2 ? "Стройка заброшена" : "Стройка зарастает"}</b> — по цели ничего не происходило {days} дн.
        Сделайте любую задачу или отметьте, что возвращаетесь. Если цель больше не нужна, её можно удалить.
      </p>
      <button className="btn ghost" type="button" onClick={() => touchGoal(goal.id)}>Я вернусь к этой цели</button>
    </div>
  );
}
