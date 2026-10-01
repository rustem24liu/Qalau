import { pad } from "./format";

const dstr = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export const today = () => dstr(new Date());

/** Local date n days ago, as YYYY-MM-DD. */
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dstr(d);
};

export const yesterday = () => daysAgo(1);
