import { SIZE_LABEL, sizeOf, TASK_COINS, TASK_SIZES, type Task } from "@qalau/core";
import { useStore } from "../store";

/** S / M / L badge; each click makes the task one size bigger, wrapping around. */
export function SizeToggle({ task }: { task: Task }) {
  const setSize = useStore(s => s.setSize);
  const size = sizeOf(task);
  const next = TASK_SIZES[(TASK_SIZES.indexOf(size) + 1) % TASK_SIZES.length];
  return (
    <button
      type="button"
      className={"size s-" + size}
      onClick={() => setSize(task.id, next)}
      title={`${SIZE_LABEL[size]} задача · +${TASK_COINS[size]} монет. Нажмите: ${SIZE_LABEL[next].toLowerCase()}`}
      aria-label={`Размер: ${SIZE_LABEL[size]}. Сделать ${SIZE_LABEL[next].toLowerCase()}`}
    >
      {size}
    </button>
  );
}
