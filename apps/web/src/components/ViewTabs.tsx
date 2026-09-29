import { useStore } from "../store";

/** Switch between one goal's building site and the whole city. */
export function ViewTabs() {
  const view = useStore(s => s.view);
  const cityName = useStore(s => s.state.city?.name);
  const setView = useStore(s => s.setView);
  return (
    <div className="view-tabs" role="tablist" aria-label="Экран">
      <button type="button" role="tab" aria-selected={view === "site"} onClick={() => setView("site")}>Стройка</button>
      <button type="button" role="tab" aria-selected={view === "city"} onClick={() => setView("city")}>
        Город{cityName ? ` · ${cityName}` : ""}
      </button>
    </div>
  );
}
