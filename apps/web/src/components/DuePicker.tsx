import { dueLabel, dueState } from "@qalau/core";
import { useRef } from "react";
import { CalendarIcon } from "./icons";

interface Props {
  due?: string;
  onChange(due: string | null): void;
  /** What it is the deadline of, for screen readers. */
  of: string;
}

/** Deadline chip: opens the browser's date picker; shows «сегодня», «просрочено 2 дн.» etc. */
export function DuePicker({ due, onChange, of }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = input.current;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); el.click(); }
  };
  return (
    <span className="due-wrap">
      <button
        type="button"
        className={"due" + (due ? " " + dueState(due) : " none")}
        onClick={open}
        aria-label={due ? `Срок ${of}: ${dueLabel(due)}. Изменить` : `Задать срок ${of}`}
        title={due ? undefined : "Задать срок"}
      >
        <CalendarIcon />
        {due && dueLabel(due)}
      </button>
      {due && <button type="button" className="due-clear" aria-label={`Убрать срок ${of}`} onClick={() => onChange(null)}>×</button>}
      <input ref={input} type="date" className="due-input" tabIndex={-1} aria-hidden="true" value={due ?? ""} onChange={e => onChange(e.target.value || null)} />
    </span>
  );
}
