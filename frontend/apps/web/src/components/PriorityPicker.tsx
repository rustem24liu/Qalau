import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@qalau/core";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { FlagIcon } from "./icons";

/** Priority tag next to a task; click opens a small menu to change it. */
export function PriorityPicker({ taskId, value }: { taskId: string; value?: Priority }) {
  const setPriority = useStore(s => s.setPriority);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  // close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const pick = (p: Priority | null) => { setPriority(taskId, p); setOpen(false); };

  return (
    <span className="prio-wrap" ref={root}>
      <button
        type="button"
        className={"prio" + (value ? " " + value : " none")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={value ? `Приоритет: ${PRIORITY_LABEL[value]}. Изменить` : "Задать приоритет"}
        title={value ? undefined : "Задать приоритет"}
        onClick={() => setOpen(o => !o)}
      >
        <FlagIcon />
        {value && PRIORITY_LABEL[value]}
      </button>
      {open && (
        <span className="prio-menu" role="menu">
          {PRIORITIES.map(p => (
            <button key={p} type="button" role="menuitemradio" aria-checked={p === value} className={"prio " + p} onClick={() => pick(p)}>
              <FlagIcon />{PRIORITY_LABEL[p]}
            </button>
          ))}
          <button type="button" role="menuitemradio" aria-checked={!value} className="prio none" onClick={() => pick(null)}>
            Без приоритета
          </button>
        </span>
      )}
    </span>
  );
}
