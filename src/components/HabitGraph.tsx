import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Habit, colorClass } from "@/lib/habits-types";
import { addDays, computeStreaks, keyToDMY, today, toKey } from "@/lib/habits-utils";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  habit: Habit | null;
  onClose: () => void;
}

type RangeKey = "1W" | "30D" | "90D" | "1Y";
const RANGES: { key: RangeKey; label: string; days: number; cols: number }[] = [
  { key: "1W", label: "1 Week", days: 7, cols: 7 },
  { key: "30D", label: "30 Days", days: 30, cols: 10 },
  { key: "90D", label: "90 Days", days: 90, cols: 15 },
  { key: "1Y", label: "1 Year", days: 365, cols: 20 },
];

const HabitGraph = ({ habit, onClose }: Props) => {
  const [rangeKey, setRangeKey] = useState<RangeKey>("90D");
  const [offset, setOffset] = useState(0);
  const range = RANGES.find((r) => r.key === rangeKey)!;
  const WINDOW = range.days;

  const stats = useMemo(
    () => (habit ? computeStreaks(habit) : { current: 0, longest: 0, total: 0 }),
    [habit],
  );

  const days = useMemo(() => {
    const t = today();
    const end = addDays(t, -offset * WINDOW);
    const windowStart = addDays(end, -(WINDOW - 1));
    const arr: { date: Date; key: string; marked: boolean; isFuture: boolean; isToday: boolean; runLen: number; posInRun: number }[] = [];
    for (let i = 0; i < WINDOW; i++) {
      const d = addDays(windowStart, i);
      const k = toKey(d);
      const marked = !!habit?.marks[k];
      arr.push({
        date: d,
        key: k,
        marked,
        isFuture: d.getTime() > t.getTime(),
        isToday: d.getTime() === t.getTime(),
        runLen: 0,
        posInRun: 0,
      });
    }
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].marked) continue;
      let s = i;
      let e = i;
      while (s > 0 && arr[s - 1].marked) s--;
      while (e < arr.length - 1 && arr[e + 1].marked) e++;
      arr[i].runLen = e - s + 1;
      arr[i].posInRun = i - s;
    }
    return arr;
  }, [habit, offset, WINDOW]);

  const rangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const fmt = (d: Date) => {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}-${month}-${d.getFullYear()}`;
    };
    return `${fmt(days[0].date)} – ${fmt(days[days.length - 1].date)}`;
  }, [days]);

  // Progress chart: cumulative completion % over window, bucketed
  const chartData = useMemo(() => {
    const buckets = Math.min(WINDOW, 30);
    const size = Math.ceil(WINDOW / buckets);
    const data: { label: string; rate: number }[] = [];
    for (let i = 0; i < buckets; i++) {
      const slice = days.slice(i * size, (i + 1) * size);
      if (slice.length === 0) continue;
      const valid = slice.filter((d) => !d.isFuture);
      const marked = valid.filter((d) => d.marked).length;
      const rate = valid.length ? Math.round((marked / valid.length) * 100) : 0;
      const d = slice[0].date;
      const label =
        WINDOW <= 30
          ? `${d.getDate()}/${d.getMonth() + 1}`
          : `${d.getDate()}/${d.getMonth() + 1}`;
      data.push({ label, rate });
    }
    return data;
  }, [days, WINDOW]);

  return (
    <Dialog
      open={!!habit}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setOffset(0);
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {habit && <span className={cn("w-3 h-3 rounded-full", colorClass[habit.color])} />}
            {habit?.name ?? ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 mb-2">
          <Stat label="Current streak" value={stats.current} />
          <Stat label="Longest streak" value={stats.longest} />
          <Stat label="Total completions" value={stats.total} />
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-muted w-fit">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRangeKey(r.key);
                setOffset(0);
              }}
              className={cn(
                "text-xs px-3 py-1 rounded transition-colors",
                rangeKey === r.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {range.label} habit history
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{rangeLabel}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <TooltipProvider>
          <div
            className="grid gap-1 p-2 rounded-md border border-border"
            style={{ gridTemplateColumns: `repeat(${range.cols}, minmax(0, 1fr))` }}
          >
            {days.map((d) => {
              const t = d.runLen > 1 ? d.posInRun / (d.runLen - 1) : 0.5;
              const whiteAlpha = d.marked ? Math.max(0, (0.5 - t) * 0.9) : 0;
              const blackAlpha = d.marked ? Math.max(0, (t - 0.5) * 1.1) : 0;
              return (
                <Tooltip key={d.key} delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "aspect-square rounded-sm relative overflow-hidden",
                        d.isFuture
                          ? "bg-transparent"
                          : d.marked
                          ? colorClass[habit?.color ?? "green"]
                          : "bg-muted",
                        d.isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      )}
                    >
                      {whiteAlpha > 0 && (
                        <span className="absolute inset-0 bg-white pointer-events-none" style={{ opacity: whiteAlpha }} />
                      )}
                      {blackAlpha > 0 && (
                        <span className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: blackAlpha }} />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <div className="font-medium">{keyToDMY(d.key)}</div>
                    <div className="text-muted-foreground">
                      {d.isFuture ? "Upcoming" : d.marked ? `Completed ✓ · streak ${d.runLen}` : "Not marked"}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Progress chart */}
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Progress (% completion)
          </div>
          <div className="h-48 w-full rounded-md border border-border p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 100]} />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}%`, "Completion"]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-md border border-border p-3 text-center">
    <div className="text-2xl font-light">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
  </div>
);

export default HabitGraph;
