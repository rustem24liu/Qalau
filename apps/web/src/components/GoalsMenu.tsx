import { useCallback, useRef, useState } from "react";
import { useActiveGoal, useStore } from "../store";
import { Dialog } from "./Dialog";
import { HouseIcon } from "./icons";
import { Street } from "./Street";

/** Header button with the goal count; opens all goals (houses) in a dialog. */
export function GoalsMenu({ night }: { night: boolean }) {
  const count = useStore(s => s.state.goals.length);
  const active = useActiveGoal();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={btn}
        className="goals-btn"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={active.title ? `Сейчас: ${active.title}` : undefined}
        onClick={() => setOpen(true)}
      >
        <span className="ic"><HouseIcon /></span>
        <span>Мои цели</span>
        <span className="n">{count}</span>
      </button>
      {open && (
        <Dialog title="Мои цели" onClose={close} className="wide">
          <Street night={night} onPick={close} />
        </Dialog>
      )}
    </>
  );
}
