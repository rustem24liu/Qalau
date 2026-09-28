import { useLiveProgress } from "../hooks/useLiveProgress";
import { useDayPhase } from "../hooks/useWeatherSync";
import { useActiveGoal, useStore } from "../store";
import { ProgressMeter } from "./ProgressMeter";
import { SceneView } from "./SceneView";
import { TimerBox } from "./TimerBox";

/** Left column: the construction site. */
export function SitePanel({ night }: { night: boolean }) {
  const goal = useActiveGoal();
  const timer = useStore(s => s.state.timer);
  const { N, k } = useLiveProgress(goal);
  const phase = useDayPhase();
  const working = !!timer && timer.goalId === goal.id && timer.paused == null;
  // after dark at the user's location the site is lit for night, whatever the theme
  const dark = night || phase === "night";

  return (
    <div className="site">
      <SceneView goal={goal} k={k} N={N} night={dark} working={working} />
      {timer && <TimerBox key={timer.taskId} timer={timer} activeGoal={goal} />}
      <ProgressMeter goal={goal} k={k} N={N} timer={timer} />
    </div>
  );
}
