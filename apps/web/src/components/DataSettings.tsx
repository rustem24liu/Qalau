import { backupFileName, exportBackup, parseBackup, type AppState } from "@qalau/core";
import { useRef, useState } from "react";
import { useStore } from "../store";

const summary = (s: AppState) => `${s.goals.length} ${plural(s.goals.length, "цель", "цели", "целей")}, ${s.wallet.coins} монет`;
const plural = (n: number, one: string, few: string, many: string) =>
  n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

/** Backup to a file and restore from it — the only safety net while data lives in this browser. */
export function DataSettings() {
  const state = useStore(s => s.state);
  const { replaceState, showToast } = useStore.getState();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ state: AppState; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportBackup(state)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const pick = async (f: File | undefined) => {
    setError(null);
    setPending(null);
    if (!f) return;
    const res = parseBackup(await f.text());
    if (res.ok) setPending({ state: res.state, name: f.name });
    else setError(res.error);
    if (file.current) file.current.value = ""; // allow picking the same file again
  };

  const restore = () => {
    if (!pending) return;
    replaceState(pending.state);
    showToast(`Данные восстановлены: ${summary(pending.state)}`);
    setPending(null);
  };

  return (
    <section className="menu-sec">
      <h3>Данные</h3>
      <p className="menu-note">
        Всё хранится только в этом браузере: {summary(state)}. Сохраняйте копию, чтобы не потерять прогресс при очистке браузера или переходе на другое устройство.
      </p>
      <div className="data-btns">
        <button type="button" className="menu-action" onClick={download}>Скачать резервную копию</button>
        <button type="button" className="menu-action ghost" onClick={() => file.current?.click()}>Загрузить из файла</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => pick(e.target.files?.[0])} />
      </div>
      {error && <p className="menu-note data-error" role="alert">{error}</p>}
      {pending && (
        <div className="data-confirm" role="alertdialog" aria-label="Подтвердите восстановление">
          <p className="menu-note">
            Заменить текущие данные ({summary(state)}) данными из «{pending.name}» ({summary(pending.state)})? Текущие данные пропадут.
          </p>
          <div className="data-btns">
            <button type="button" className="menu-action warn" onClick={restore}>Заменить</button>
            <button type="button" className="menu-action ghost" onClick={() => setPending(null)}>Отмена</button>
          </div>
        </div>
      )}
    </section>
  );
}
