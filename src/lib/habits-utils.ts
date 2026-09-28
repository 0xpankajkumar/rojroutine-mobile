import { Habit } from "./habits-types";

export const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const today = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

export const formatMonth = (d: Date) =>
  d.toLocaleString("en-US", { month: "short" });

export const formatDayNum = (d: Date) => String(d.getDate());

export const formatWeekday = (d: Date) =>
  d.toLocaleString("en-US", { weekday: "short" }).toUpperCase();

export const formatDMY = (d: Date) => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const keyToDMY = (k: string) => {
  const [y, m, d] = k.split("-");
  return `${d}-${m}-${y}`;
};

export function getDayWindow(end: Date, count: number): Date[] {
  const days: Date[] = [];
  for (let i = count - 1; i >= 0; i--) days.push(addDays(end, -i));
  return days;
}

export function computeStreaks(habit: Habit) {
  const keys = Object.keys(habit.marks)
    .filter((k) => habit.marks[k])
    .sort();
  if (keys.length === 0) return { current: 0, longest: 0, total: 0 };

  // longest
  let longest = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = fromKey(keys[i - 1]);
    const cur = fromKey(keys[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // current — counts back from today (or yesterday if today not marked)
  let current = 0;
  let cursor = today();
  if (!habit.marks[toKey(cursor)]) cursor = addDays(cursor, -1);
  while (habit.marks[toKey(cursor)]) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, total: keys.length };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
