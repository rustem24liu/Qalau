import { isTired, neglectOf, runningTimers } from "@qalau/core";
import { useLiveProgress } from "../hooks/useLiveProgress";
import { useDayPhase } from "../hooks/useWeatherSync";
import { useActiveGoal, useStore } from "../store";
import { useCheer, type BubbleMode } from "./BuilderBubble";
import { ProgressMeter } from "./ProgressMeter";
import { RestBox } from "./RestBox";
import { RestLauncher } from "./RestLauncher";
import { SceneView } from "./SceneView";
import { TimerBox } from "./TimerBox";

/** Left column: the construction site. */
export function SitePanel({ night }: { night: boolean }) {
  const goal = useActiveGoal();
  const timers = useStore(s => s.state.timers);
  const rest = useStore(s => s.state.rest);
  const neglect = useStore(s => neglectOf(s.state, goal));
  const tired = useStore(s => isTired(s.state, s.now));
  const cheer = useCheer();
  const mood: BubbleMode = rest ? "rest" : tired ? "tired" : cheer ? "cheer" : null;
  const { N, k } = useLiveProgress(goal);
  const phase = useDayPhase();
  const workers = runningTimers(timers, goal.id).length;
  // after dark at the user's location the site is lit for night, whatever the theme
  const dark = night || phase === "night";

  return (
    <div className="site">
      <SceneView goal={goal} k={k} N={N} night={dark} workers={workers} mood={mood} neglect={neglect} />
      {rest ? <RestBox rest={rest} /> : <RestLauncher />}
      {timers.length > 0 && (
        <div className="timers">
          {timers.map(tm => <TimerBox key={tm.taskId} timer={tm} activeGoal={goal} />)}
        </div>
      )}
      <ProgressMeter goal={goal} k={k} N={N} timers={timers} />
    </div>
  );
}
