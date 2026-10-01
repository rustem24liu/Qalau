import { useState } from "react";
import { useStore } from "../store";

export function AddTaskForm() {
  const addTask = useStore(s => s.addTask);
  const [text, setText] = useState("");

  return (
    <form
      className="add"
      onSubmit={e => {
        e.preventDefault();
        const v = text.trim();
        if (!v) return;
        addTask(v);
        setText("");
      }}
    >
      <input
        className="new-task" placeholder="Новая задача, например «Сделать макет»" maxLength={140} autoComplete="off"
        value={text} onChange={e => setText(e.target.value)}
      />
      <button className="btn" type="submit">Добавить</button>
    </form>
  );
}
