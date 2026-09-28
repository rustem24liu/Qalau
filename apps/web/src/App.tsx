import { Header } from "./components/Header";
import { PlanPanel } from "./components/PlanPanel";
import { SitePanel } from "./components/SitePanel";
import { Street } from "./components/Street";
import { useDailyRollover } from "./hooks/useDailyRollover";
import { useTheme } from "./hooks/useTheme";
import { useTimerTick } from "./hooks/useTimerTick";
import { useWeatherSync } from "./hooks/useWeatherSync";

export function App() {
  const { night, toggle } = useTheme();
  useTimerTick();
  useDailyRollover();
  useWeatherSync();

  return (
    <div className="wrap">
      <Header night={night} onToggleTheme={toggle} />
      <Street night={night} />
      <section className="main">
        <SitePanel night={night} />
        <PlanPanel />
      </section>
    </div>
  );
}
