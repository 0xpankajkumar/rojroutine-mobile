export type HabitColor =
  | "green"
  | "red"
  | "purple"
  | "slate"
  | "orange"
  | "emerald"
  | "teal"
  | "blue"
  | "crimson";

export interface Habit {
  id: string;
  name: string;
  color: HabitColor;
  /** @deprecated kept for backwards compatibility — use groupIds */
  groupId?: string | null;
  groupIds: string[];
  createdAt: string; // ISO date (YYYY-MM-DD)
  marks: Record<string, boolean>; // key: YYYY-MM-DD
}

/** Groups a habit belongs to, tolerating legacy single-group data. */
export const habitGroupIds = (h: Habit): string[] =>
  h.groupIds && h.groupIds.length > 0 ? h.groupIds : h.groupId ? [h.groupId] : [];


export interface HabitGroup {
  id: string;
  name: string;
  expanded: boolean;
  color?: HabitColor;
}

export interface TrackerState {
  groups: HabitGroup[];
  habits: Habit[];
  selectedDate: string; // YYYY-MM-DD
}

export const COLOR_OPTIONS: HabitColor[] = [
  "green",
  "red",
  "purple",
  "slate",
  "orange",
  "emerald",
  "teal",
  "blue",
  "crimson",
];

export const colorClass: Record<HabitColor, string> = {
  green: "bg-habit-green",
  red: "bg-habit-red",
  purple: "bg-habit-purple",
  slate: "bg-habit-slate",
  orange: "bg-habit-orange",
  emerald: "bg-habit-emerald",
  teal: "bg-habit-teal",
  blue: "bg-habit-blue",
  crimson: "bg-habit-crimson",
};

export const hoverColorClass: Record<HabitColor, string> = {
  green: "hover:bg-habit-green/40",
  red: "hover:bg-habit-red/40",
  purple: "hover:bg-habit-purple/40",
  slate: "hover:bg-habit-slate/40",
  orange: "hover:bg-habit-orange/40",
  emerald: "hover:bg-habit-emerald/40",
  teal: "hover:bg-habit-teal/40",
  blue: "hover:bg-habit-blue/40",
  crimson: "hover:bg-habit-crimson/40",
};
