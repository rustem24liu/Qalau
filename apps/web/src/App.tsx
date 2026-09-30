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
import { FEATURES, hasViews } from "./features";
import { useStore } from "./store";

export function App() {
  const { night, toggle } = useTheme();
  useTimerTick();
  useDailyRollover();
  useWeatherSync();
  const view = useStore(s => s.view);
  const roof = useStore(s => s.state.wallet.roof);
  // a roof color bought in the shop only applies while the shop is on
  useEffect(() => scene.setRoof(FEATURES.shop ? roof : null), [roof]);

  return (
    <div className="wrap">
      <Header night={night} onToggleTheme={toggle} />
      {hasViews && <ViewTabs />}
      {view === "city" && FEATURES.city ? (
        <CityPanel night={night} />
      ) : view === "shop" && FEATURES.shop ? (
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
