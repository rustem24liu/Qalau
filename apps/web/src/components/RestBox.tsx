import { fmtClock, restLeft, type Rest } from "@qalau/core";
import { useStore } from "../store";

/** The break card: countdown and an early way back to work. */
export function RestBox({ rest }: { rest: Rest }) {
  const now = useStore(s => s.now);
  const endRest = useStore(s => s.endRest);
  const left = restLeft(rest, now);
  const n = rest.resume.length;

  return (
    <div className="timer rest">
      <div className="tm-l">
        <div className="lbl">Отдых · строитель набирается сил</div>
        <div className="tm-task">Перерыв</div>
        <div className="tm-sub">{n ? `${n === 1 ? "Задача" : "Задачи"} на паузе — продолжатся сами` : "Задач в работе не было"}</div>
      </div>
      <div className="tm-time">{fmtClock(left)}</div>
      <div className="tm-bar"><i style={{ width: (1 - left / rest.dur) * 100 + "%" }} /></div>
      <div className="tm-btns">
        <button className="btn ghost" type="button" onClick={endRest}>Вернуться к работе</button>
      </div>
    </div>
  );
}
