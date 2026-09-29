import { CityPanel } from "./components/CityPanel";
import { Header } from "./components/Header";
import { PlanPanel } from "./components/PlanPanel";
import { ShopPanel } from "./components/ShopPanel";
import { SitePanel } from "./components/SitePanel";
import { Street } from "./components/Street";
import { ViewTabs } from "./components/ViewTabs";
import { useDailyRollover } from "./hooks/useDailyRollover";
import { useTheme } from "./hooks/useTheme";
import { useTimerTick } from "./hooks/useTimerTick";
import { useWeatherSync } from "./hooks/useWeatherSync";
import { useEffect } from "react";
import { scene } from "./lib/scene";
import { useStore } from "./store";

export function App() {
  const { night, toggle } = useTheme();
  useTimerTick();
  useDailyRollover();
  useWeatherSync();
  const view = useStore(s => s.view);
  const roof = useStore(s => s.state.wallet.roof);
  useEffect(() => scene.setRoof(roof), [roof]);

  return (
    <div className="wrap">
      <Header night={night} onToggleTheme={toggle} />
      <ViewTabs />
      {view === "city" ? (
        <CityPanel night={night} />
      ) : view === "shop" ? (
        <ShopPanel />
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
