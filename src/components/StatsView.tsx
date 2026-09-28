import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { addDays, computeStreaks, fromKey, keyToDMY, today, toKey } from "@/lib/habits-utils";
import { colorClass, type Habit, type HabitColor } from "@/lib/habits-types";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const habitColorValue: Record<HabitColor, string> = {
  green: "hsl(var(--habit-green))",
  red: "hsl(var(--habit-red))",
  purple: "hsl(var(--habit-purple))",
  slate: "hsl(var(--habit-slate))",
  orange: "hsl(var(--habit-orange))",
  emerald: "hsl(var(--habit-emerald))",
  teal: "hsl(var(--habit-teal))",
  blue: "hsl(var(--habit-blue))",
  crimson: "hsl(var(--habit-crimson))",
};

const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

type Marks = Record<string, boolean>;

const asHabit = (marks: Marks): Habit =>
  ({ id: "virtual", name: "", color: "green", groupIds: [], createdAt: "", marks }) as Habit;

const computeCompletion = (marks: Marks, days: number) => {
  const t = today();
  const start = addDays(t, -(days - 1));
  let marked = 0;
  let valid = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    if (d.getTime() > t.getTime()) continue;
    valid++;
    if (marks[toKey(d)]) marked++;
  }
  return { percent: valid > 0 ? Math.round((marked / valid) * 100) : 0, marked, valid };
};

type StreakPoint = { start: string; end: string; length: number; gapDays?: number };

const computeStreakSeries = (marks: Marks): StreakPoint[] => {
  const keys = Object.keys(marks)
    .filter((k) => marks[k])
    .sort();
  const streaks: StreakPoint[] = [];
  let start = "";
  let prev = "";
  let length = 0;

  for (const key of keys) {
    const isNext =
      prev && Math.round((fromKey(key).getTime() - fromKey(prev).getTime()) / 86400000) === 1;
    if (isNext) {
      length += 1;
    } else {
      if (length > 0) streaks.push({ start, end: prev, length });
      start = key;
      length = 1;
    }
    prev = key;
  }
  if (length > 0) streaks.push({ start, end: prev, length });

  const series: StreakPoint[] = [];
  for (let i = 0; i < streaks.length; i++) {
    if (i > 0) {
      const lastEnd = fromKey(streaks[i - 1].end);
      const nextStart = fromKey(streaks[i].start);
      const missing = Math.round((nextStart.getTime() - lastEnd.getTime()) / 86400000) - 1;
      if (missing > 0) {
        const zeroDate = toKey(addDays(lastEnd, 1));
        series.push({ start: zeroDate, end: zeroDate, length: 0, gapDays: missing });
      }
    }
    series.push(streaks[i]);
  }

  const last = streaks[streaks.length - 1];
  if (last) {
    const lastEnd = fromKey(last.end);
    const referenceEnd = addDays(today(), -1);
    const missing = Math.max(
      0,
      Math.round((referenceEnd.getTime() - lastEnd.getTime()) / 86400000),
    );
    if (missing > 0) {
      const zeroDate = toKey(addDays(lastEnd, 1));
      series.push({ start: zeroDate, end: zeroDate, length: 0, gapDays: missing });
    }
  }

  return series;
};

const StreakTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: StreakPoint }>;
}) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const isZero = point.length === 0;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium">
        {isZero ? keyToDMY(point.start) : `${keyToDMY(point.start)} → ${keyToDMY(point.end)}`}
      </div>
      <div className="text-muted-foreground">
        {isZero ? `0 day streak (${point.gapDays ?? 1} day gap)` : `Streak: ${point.length} days`}
      </div>
    </div>
  );
};

const HEATMAP_DAYS = 365;

interface StatsViewProps {
  title: string;
  subtitle?: string;
  color: HabitColor;
  marks: Marks;
  children?: ReactNode;
}

const StatsView = ({ title, subtitle, color, marks, children }: StatsViewProps) => {
  const yearDays = isLeapYear(today().getFullYear()) ? 366 : 365;

  const progressRanges = useMemo(
    () => [
      { key: "7D", label: "7 Days", days: 7 },
      { key: "30D", label: "30 Days", days: 30 },
      { key: "90D", label: "90 Days", days: 90 },
      { key: "1Y", label: `${yearDays} Days`, days: yearDays },
    ],
    [yearDays],
  );

  const stats = useMemo(() => computeStreaks(asHabit(marks)), [marks]);

  const progress = useMemo(
    () => progressRanges.map((r) => ({ ...r, ...computeCompletion(marks, r.days) })),
    [marks, progressRanges],
  );

  const streakSeries = useMemo(() => {
    const cutoff = toKey(addDays(today(), -89));
    return computeStreakSeries(marks).filter((s) => s.end >= cutoff);
  }, [marks]);

  const { weeks, monthLabels } = useMemo(() => {
    const t = today();
    const end = t;
    const start = addDays(end, -(HEATMAP_DAYS - 1));
    const dow = (start.getDay() + 6) % 7;
    const gridStart = addDays(start, -dow);

    const totalDays = Math.ceil((end.getTime() - gridStart.getTime()) / 86400000 + 1);
    const weekCount = Math.ceil(totalDays / 7);

    const weeks: {
      date: Date;
      key: string;
      marked: boolean;
      isFuture: boolean;
      inRange: boolean;
      isToday: boolean;
    }[][] = [];
    for (let w = 0; w < weekCount; w++) {
      const col: (typeof weeks)[number] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(gridStart, w * 7 + d);
        const key = toKey(date);
        const inRange = date >= start && date <= end;
        const isFuture = date.getTime() > t.getTime();
        col.push({
          date,
          key,
          marked: inRange && !!marks[key],
          isFuture,
          inRange,
          isToday: date.getTime() === t.getTime(),
        });
      }
      weeks.push(col);
    }

    const monthLabels: { col: number; name: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((col, i) => {
      const m = col[0].date.getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col: i, name: MONTH_NAMES[m] });
        lastMonth = m;
      }
    });

    return { weeks, monthLabels };
  }, [marks]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3">
          <span className={cn("w-4 h-4 rounded-full", colorClass[color])} />
          <h2 className="text-2xl md:text-3xl font-light tracking-tight">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
      </motion.div>

      {children}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Current streak", value: stats.current, suffix: "days" },
          { label: "Longest streak", value: stats.longest, suffix: "days" },
          { label: "Total completions", value: stats.total },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
          >
            <Stat label={s.label} value={s.value} suffix={s.suffix} />
          </motion.div>
        ))}
      </div>

      {/* Progress rings */}
      <div className="mb-10">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Progress</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {progress.map((p, i) => (
            <ProgressRing
              key={p.key}
              label={p.label}
              percent={p.percent}
              marked={p.marked}
              valid={p.valid}
              color={color}
              delay={i * 0.12}
            />
          ))}
        </div>
      </div>

      {/* Streak line chart */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mb-10"
        aria-labelledby="streaks-heading"
      >
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <h3
              id="streaks-heading"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              90-day previous streaks
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Length of each past streak in the last 90 days
            </p>
          </div>
          <span className="text-sm tabular-nums text-primary">{streakSeries.length} streaks</span>
        </div>
        <motion.div
          className="rounded-md border border-border p-4 md:p-5"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.35, ease: "easeOut" }}
        >
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={streakSeries} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="start"
                  tickFormatter={(value) => keyToDMY(String(value)).slice(0, 5)}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, Math.max(1, stats.longest)]}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <ChartTooltip content={<StreakTooltip />} />
                <Line
                  type="monotone"
                  dataKey="length"
                  name="Streak length"
                  stroke={habitColorValue[color]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: habitColorValue[color], strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    fill: habitColorValue[color],
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                  isAnimationActive
                  animationBegin={450}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.section>

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-10"
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          {yearDays}-days habit history
        </div>
        <div className="rounded-md border border-border p-4 overflow-x-auto">
          <TooltipProvider>
            <div className="inline-flex flex-col gap-1 min-w-full">
              <div
                className="grid gap-1 text-[0.625rem] text-muted-foreground pl-8"
                style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(12px, 1fr))` }}
              >
                {weeks.map((_, i) => {
                  const m = monthLabels.find((l) => l.col === i);
                  return (
                    <div key={i} className="h-3">
                      {m?.name}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <div className="grid grid-rows-7 gap-1 text-[0.625rem] text-muted-foreground w-6 shrink-0">
                  {WEEKDAY_LABELS.map((w, i) => (
                    <div key={i} className="h-3 leading-3">
                      {w}
                    </div>
                  ))}
                </div>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.004, delayChildren: 0.4 } },
                  }}
                  className="grid gap-1 flex-1"
                  style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(12px, 1fr))` }}
                >
                  {weeks.map((col, i) => (
                    <div key={i} className="grid grid-rows-7 gap-1">
                      {col.map((d) => (
                        <Tooltip key={d.key} delayDuration={100}>
                          <TooltipTrigger asChild>
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, scale: 0.4 },
                                visible: { opacity: 1, scale: 1 },
                              }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className={cn(
                                "aspect-square rounded-[2px]",
                                !d.inRange || d.isFuture
                                  ? "bg-transparent"
                                  : d.marked
                                    ? colorClass[color]
                                    : "bg-muted",
                                d.isToday && "ring-1 ring-primary",
                              )}
                            />
                          </TooltipTrigger>
                          {d.inRange && (
                            <TooltipContent side="top">
                              <div className="font-medium">{keyToDMY(d.key)}</div>
                              <div className="text-muted-foreground">
                                {d.isFuture ? "Upcoming" : d.marked ? "Completed ✓" : "Not marked"}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </motion.div>
    </>
  );
};

const ProgressRing = ({
  label,
  percent,
  marked,
  valid,
  color,
  delay = 0,
}: {
  label: string;
  percent: number;
  marked: number;
  valid: number;
  color: HabitColor;
  delay?: number;
}) => {
  const size = 144;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  const progress = useMotionValue(0);
  const dash = useTransform(progress, (v) => `${(v / 100) * C} ${C}`);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(progress, percent, {
      duration: 1.2,
      delay,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [percent, delay, progress]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-md border border-border p-4 flex flex-col items-center"
    >
      <div className="text-[0.625rem] uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="relative" style={{ height: size, width: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={habitColorValue[color]}
            strokeWidth={stroke}
            strokeLinecap="round"
            style={{ strokeDasharray: dash }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-light tabular-nums">{display}%</div>
        </div>
      </div>
      <div className="text-[0.6875rem] text-muted-foreground mt-2">
        {marked} / {valid} days
      </div>
    </motion.div>
  );
};

const Stat = ({ label, value, suffix }: { label: string; value: number; suffix?: string }) => (
  <div className="rounded-md border border-border p-4 text-center">
    <div className="text-3xl font-light">
      {value}
      {suffix && <span className="text-base text-muted-foreground ml-1">{suffix}</span>}
    </div>
    <div className="text-[0.625rem] uppercase tracking-wider text-muted-foreground mt-1">
      {label}
    </div>
  </div>
);

export default StatsView;
