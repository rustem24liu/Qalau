import { pad } from "./format";

const dstr = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

export const today = () => dstr(new Date());

export const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dstr(d);
};
