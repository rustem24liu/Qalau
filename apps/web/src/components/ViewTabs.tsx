import { useEffect, useRef, useState } from "react";
import { FEATURES } from "../features";
import { useStore } from "../store";

/** Switch between one goal's building site, the whole city and the shop; shows the coin balance. */
export function ViewTabs() {
  const view = useStore(s => s.view);
  const cityName = useStore(s => s.state.city?.name);
  const coins = useStore(s => s.state.wallet.coins);
  const setView = useStore(s => s.setView);
  const bump = useBump(coins);
  return (
    <div className="tabs-row">
      <div className="view-tabs" role="tablist" aria-label="Экран">
        <button type="button" role="tab" aria-selected={view === "site"} onClick={() => setView("site")}>Стройка</button>
        {FEATURES.city && (
          <button type="button" role="tab" aria-selected={view === "city"} onClick={() => setView("city")}>
            Город{cityName ? ` · ${cityName}` : ""}
          </button>
        )}
        {FEATURES.shop && <button type="button" role="tab" aria-selected={view === "shop"} onClick={() => setView("shop")}>Магазин</button>}
      </div>
      {FEATURES.shop && <button type="button" className={"coins" + (bump ? " bump" : "")} onClick={() => setView("shop")} aria-label={`Монет: ${coins}. Открыть магазин`}>
        <span className="coin" aria-hidden="true" />{coins}
      </button>}
    </div>
  );
}

/** True for a moment after the balance grows, to make earned coins noticeable. */
function useBump(value: number): boolean {
  const prev = useRef(value);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const grew = value > prev.current;
    prev.current = value;
    if (!grew) return;
    setOn(true);
    const id = setTimeout(() => setOn(false), 700);
    return () => clearTimeout(id);
  }, [value]);
  return on;
}
