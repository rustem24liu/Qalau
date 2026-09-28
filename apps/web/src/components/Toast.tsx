import { useEffect, useState } from "react";
import { useStore } from "../store";

export function Toast() {
  const toast = useStore(s => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="toast" role="status" hidden={!visible}>
      {toast?.text}
    </div>
  );
}
