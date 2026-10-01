import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

interface Props {
  title: string;
  onClose(): void;
  /** Extra class for the panel, e.g. "wide". */
  className?: string;
  children: ReactNode;
}

/** Centered modal: closes on ✕, Esc or a click on the backdrop; focuses ✕ when opened. */
export function Dialog({ title, onClose, className, children }: Props) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const titleId = useRef("dlg-" + Math.random().toString(36).slice(2, 8)).current;

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="menu-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"menu-panel" + (className ? " " + className : "")} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="menu-head">
          <h2 id={titleId}>{title}</h2>
          <button ref={closeBtn} type="button" className="menu-close" aria-label="Закрыть" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
