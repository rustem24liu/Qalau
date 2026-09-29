import { CityPanel } from "./components/CityPanel";
import { Header } from "./components/Header";
import { PlanPanel } from "./components/PlanPanel";
import { SitePanel } from "./components/SitePanel";
import { Street } from "./components/Street";
import { ViewTabs } from "./components/ViewTabs";
import { useDailyRollover } from "./hooks/useDailyRollover";
import { useTheme } from "./hooks/useTheme";
import { useTimerTick } from "./hooks/useTimerTick";
import { useWeatherSync } from "./hooks/useWeatherSync";
import { useStore } from "./store";

export function App() {
  const { night, toggle } = useTheme();
  useTimerTick();
  useDailyRollover();
  useWeatherSync();
  const view = useStore(s => s.view);

  return (
    <div className="wrap">
      <Header night={night} onToggleTheme={toggle} />
      <ViewTabs />
      {view === "city" ? (
        <CityPanel night={night} />
      ) : (
        <>
          <Street night={night} />
          <section className="main">
            <SitePanel night={night} />
            <PlanPanel />
          </section>
        </>
      )}
    </div>
  );
}
