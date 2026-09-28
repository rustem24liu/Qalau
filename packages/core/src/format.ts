export const pad = (n: number) => String(n).padStart(2, "0");

/** Clock-style "mm:ss" or "h:mm:ss". */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(s % 60);
}

/** Human duration: "1 ч 5 мин", "3 мин 20 с", "40 с". */
export function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h) return `${h} ч ${m} мин`;
  if (m) return ss && m < 10 ? `${m} мин ${ss} с` : `${m} мин`;
  return `${ss} с`;
}
