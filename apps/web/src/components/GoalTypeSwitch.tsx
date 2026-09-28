import { GOAL_TYPES, KINDS, type Goal } from "@qalau/core";
import { useStore } from "../store";

export function GoalTypeSwitch({ goal }: { goal: Goal }) {
  const setGoalType = useStore(s => s.setGoalType);
  return (
    <div className="seg" role="radiogroup" aria-label="Размер цели">
      {GOAL_TYPES.map(t => (
        <button key={t} type="button" role="radio" aria-checked={goal.type === t} onClick={() => setGoalType(t)}>
          <b>{KINDS[t].name}</b>
          <small>{KINDS[t].house} · {KINDS[t].note}</small>
        </button>
      ))}
    </div>
  );
}

export function DailyNote({ goal }: { goal: Goal }) {
  if (goal.type !== "daily") return null;
  return (
    <div className="daily-note">
      <span>Галочки сбрасываются каждый день</span>
      <span>Серия: <b>{goal.streak || 0}</b> дн.</span>
      <span>Хижин построено: <b>{goal.built || 0}</b></span>
    </div>
  );
}
