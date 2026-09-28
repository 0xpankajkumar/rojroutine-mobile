import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  SlidersHorizontal,
  Trophy,
  Trash2,
  Pencil,
  Sun,
  Moon,
  List,
  FolderPlus,
  LayoutGrid,
  BarChart2,
  User,
  ArrowLeft,
  Flame,
  CheckSquare,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/use-theme";
import { useTracker } from "@/lib/use-tracker";
import {
  addDays,
  computeStreaks,
  formatDayNum,
  formatMonth,
  formatWeekday,
  fromKey,
  getDayWindow,
  keyToDMY,
  toKey,
  today,
} from "@/lib/habits-utils";
import { colorClass, hoverColorClass, COLOR_OPTIONS, Habit, HabitColor, habitGroupIds } from "@/lib/habits-types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import AuthButton from "./AuthButton";
import ConfirmDialog from "./ConfirmDialog";
import { useNavigate } from "react-router-dom";
import StatsView, { habitColorValue } from "./StatsView";

const WEEKDAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

const HabitTracker = () => {
  const {
    state,
    toggleMark,
    addHabit,
    addGroup,
    toggleGroup,
    updateHabit,
    renameGroup,
    updateGroup,
    deleteHabit,
    deleteGroup,
    setSelectedDate,
    reorderHabit,
    addHabitToGroup,
  } = useTracker();

  const { theme, toggle: toggleTheme } = useTheme();
  const todayDate = today();
  const todayKey = toKey(todayDate);
  const rawEnd = useMemo(() => fromKey(state.selectedDate), [state.selectedDate]);
  const endDate = rawEnd > todayDate ? todayDate : rawEnd;

  // Active Mobile Tab: "track" | "groups" | "stats" | "me"
  const [activeTab, setActiveTab] = useState<"track" | "groups" | "stats" | "me">("track");

  // Active Detail Screen state (null or { type: "group" | "habit", id: string })
  const [activeDetail, setActiveDetail] = useState<{ type: "group" | "habit"; id: string } | null>(null);

  // 7-day week window for mobile week selector
  const weekDays = useMemo(() => getDayWindow(endDate, 7), [endDate]);

  const shiftWeek = (n: number) => {
    const next = addDays(endDate, n);
    const clamped = next > todayDate ? todayDate : next;
    setSelectedDate(toKey(clamped));
  };
  const canGoNextWeek = endDate < todayDate;

  // Order: ungrouped first, then groups with their habits
  const ungrouped = state.habits.filter((h) => habitGroupIds(h).length === 0);

  // Dialog states
  const [habitDialogOpen, setHabitDialogOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitGroups, setNewHabitGroups] = useState<string[]>([]);
  const [newHabitColor, setNewHabitColor] = useState<HabitColor>("green");

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState<HabitColor>("slate");

  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [editHabitName, setEditHabitName] = useState("");
  const [editHabitGroups, setEditHabitGroups] = useState<string[]>([]);
  const [editHabitColor, setEditHabitColor] = useState<HabitColor>("green");

  const [editGroup, setEditGroup] = useState<{ id: string; name: string; color?: HabitColor } | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupColor, setEditGroupColor] = useState<HabitColor>("slate");

  const navigate = useNavigate();

  const [filter, setFilter] = useState<"all" | string>("all");

  const [pendingDelete, setPendingDelete] = useState<
    { type: "habit" | "group"; id: string; name: string } | null
  >(null);

  const openEditHabit = (h: Habit) => {
    setEditHabit(h);
    setEditHabitName(h.name);
    setEditHabitGroups(habitGroupIds(h));
    setEditHabitColor(h.color);
  };

  const openEditGroup = (g: { id: string; name: string; color?: HabitColor }) => {
    setEditGroup(g);
    setEditGroupName(g.name);
    setEditGroupColor(g.color ?? "slate");
  };

  const confirmDeleteHabit = (id: string) => {
    const habit = state.habits.find((h) => h.id === id);
    if (habit) setPendingDelete({ type: "habit", id: habit.id, name: habit.name });
  };

  const confirmDeleteGroup = (id: string) => {
    const group = state.groups.find((g) => g.id === id);
    if (group) setPendingDelete({ type: "group", id: group.id, name: group.name });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "habit") {
      deleteHabit(pendingDelete.id);
    } else {
      deleteGroup(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  // Calculations for summary card
  const selectedDateKey = state.selectedDate;
  const markedTodayCount = state.habits.filter((h) => h.marks[selectedDateKey]).length;
  const totalHabitsCount = state.habits.length;
  const totalCompletions = state.habits.reduce((sum, h) => sum + Object.keys(h.marks).length, 0);

  // Group streaks calculation
  const groupStreaks = useMemo(() => {
    let bestStreak = 0;
    state.groups.forEach((g) => {
      const gHabits = state.habits.filter((h) => habitGroupIds(h).includes(g.id));
      if (gHabits.length === 0) return;
      const gStats = gHabits.reduce(
        (acc, h) => {
          const s = computeStreaks(h);
          return { current: acc.current + s.current, longest: acc.longest + s.longest };
        },
        { current: 0, longest: 0 }
      );
      if (gStats.longest > bestStreak) bestStreak = gStats.longest;
    });
    return bestStreak;
  }, [state.groups, state.habits]);

  // Top streaks ranking list
  const topStreaks = useMemo(() => {
    return [...state.habits]
      .map((h) => ({ habit: h, streak: computeStreaks(h).current }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);
  }, [state.habits]);

  // Calculate Group details when a detail group is active
  const detailGroup = activeDetail?.type === "group" ? state.groups.find((g) => g.id === activeDetail.id) : null;
  const detailGroupHabits = useMemo(() => {
    if (!detailGroup) return [];
    return state.habits.filter((h) => habitGroupIds(h).includes(detailGroup.id));
  }, [detailGroup, state.habits]);

  const detailGroupMarks = useMemo(() => {
    if (detailGroupHabits.length === 0) return {};
    const result: Record<string, boolean> = {};
    const keys = new Set<string>();
    detailGroupHabits.forEach((h) =>
      Object.keys(h.marks).forEach((k) => {
        if (h.marks[k]) keys.add(k);
      })
    );
    keys.forEach((k) => {
      if (detailGroupHabits.every((h) => h.marks[k])) result[k] = true;
    });
    return result;
  }, [detailGroupHabits]);

  // Calculate Habit details when a detail habit is active
  const detailHabit = activeDetail?.type === "habit" ? state.habits.find((h) => h.id === activeDetail.id) : null;

  return (
    <div className="mobile-app-frame mx-auto shadow-2xl transition-all">
      {/* App Header */}
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-2.5 sticky top-0 bg-background/95 backdrop-blur-md z-30 border-b border-border/40">
        <div className="w-[28px] h-[28px] bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
          ✓
        </div>
        <h1 className="text-xl font-bold flex-1 tracking-tight text-foreground">RojRoutine</h1>
        <div className="flex items-center gap-1.5 text-primary font-semibold text-sm bg-primary/10 px-2.5 py-1 rounded-full">
          <Trophy className="w-3.5 h-3.5" />
          <span>{totalCompletions}</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
        <div className="shrink-0 scale-90">
          <AuthButton />
        </div>
      </header>

      {/* Detail Screen View overlay (Group or Habit detail) */}
      {activeDetail ? (
        <main className="flex-1 overflow-y-auto px-4 py-3 animate-fadeIn">
          <button
            onClick={() => setActiveDetail(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to tracker
          </button>

          {detailGroup ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("w-3 h-3 rounded-full", colorClass[detailGroup.color ?? "red"])} />
                <h2 className="text-xl font-bold uppercase tracking-tight">{detailGroup.name}</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                A day counts when every habit in this group is marked.
              </p>
              <StatsView
                title={detailGroup.name}
                subtitle="Group completion progress"
                color={detailGroup.color ?? "red"}
                marks={detailGroupMarks}
              >
                <div className="mt-6 mb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Habits in this group ({detailGroupHabits.length})
                  </div>
                  {detailGroupHabits.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No habits in this group yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailGroupHabits.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => setActiveDetail({ type: "habit", id: h.id })}
                          className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={cn("w-2.5 h-2.5 rounded-full", colorClass[h.color])} />
                            <span className="text-sm font-medium">{h.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            🔥 {computeStreaks(h).current} streak ›
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </StatsView>
            </div>
          ) : detailHabit ? (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("w-3 h-3 rounded-full", colorClass[detailHabit.color])} />
                <h2 className="text-xl font-bold tracking-tight">{detailHabit.name}</h2>
              </div>
              <StatsView title={detailHabit.name} color={detailHabit.color} marks={detailHabit.marks} />
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">Item not found.</div>
          )}
        </main>
      ) : (
        /* Main Tab Views */
        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* TAB 1: TRACKER SCREEN (s-track) */}
          {activeTab === "track" && (
            <div className="space-y-4 animate-fadeIn">
              {/* 7-Day Week Strip Selector */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => shiftWeek(-1)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-7 gap-1.5 flex-1">
                  {weekDays.map((d) => {
                    const k = toKey(d);
                    const isToday = k === todayKey;
                    const isSelected = k === state.selectedDate;
                    const isFuture = d > todayDate;
                    const dayInitial = WEEKDAY_NAMES[d.getDay()];

                    return (
                      <button
                        key={k}
                        disabled={isFuture}
                        onClick={() => setSelectedDate(k)}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 rounded-xl text-center transition-all border",
                          isFuture && "opacity-30 cursor-not-allowed border-transparent bg-muted/20",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-md scale-105"
                            : isToday
                              ? "border-primary/50 text-foreground bg-primary/10"
                              : "bg-card border-border text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wider">{dayInitial}</span>
                        <span className="text-base font-bold leading-tight mt-0.5">{formatDayNum(d)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => shiftWeek(1)}
                  disabled={!canGoNextWeek}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Cards Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card border border-border rounded-2xl p-3 text-center">
                  <b className="text-xl font-bold block text-foreground">
                    {markedTodayCount}/{totalHabitsCount}
                  </b>
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Done today
                  </span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 text-center">
                  <b className="text-xl font-bold block text-foreground">{groupStreaks}</b>
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Best streak
                  </span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 text-center">
                  <b className="text-xl font-bold block text-foreground">{totalCompletions}</b>
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Total
                  </span>
                </div>
              </div>

              {/* Group Filter Dropdown bar */}
              {state.groups.length > 0 && (
                <div className="flex items-center justify-between px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>
                          {filter === "all"
                            ? "All habits"
                            : state.groups.find((g) => g.id === filter)?.name ?? "All habits"}
                        </span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => setFilter("all")}>
                        <List className="w-4 h-4 mr-2" /> All Habits
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                        Groups
                      </DropdownMenuLabel>
                      {state.groups.map((g) => (
                        <DropdownMenuItem key={g.id} onClick={() => setFilter(g.id)}>
                          <span className={cn("w-2 h-2 rounded-full mr-2", colorClass[g.color ?? "slate"])} />
                          {g.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Group Accordion Cards */}
              <div className="space-y-3">
                {state.groups
                  .filter((g) => filter === "all" || filter === g.id)
                  .map((g) => {
                    const habits = state.habits.filter((h) => habitGroupIds(h).includes(g.id));
                    const completedToday = habits.filter((h) => h.marks[selectedDateKey]).length;
                    const pct = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;
                    const groupColorClass = colorClass[g.color ?? "red"];

                    return (
                      <div
                        key={g.id}
                        className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all"
                      >
                        {/* Group Header */}
                        <div
                          className={cn(
                            "flex items-center gap-2.5 px-3.5 py-3 text-white font-medium cursor-pointer transition-opacity hover:opacity-95",
                            groupColorClass
                          )}
                          onClick={() => setActiveDetail({ type: "group", id: g.id })}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(g.id);
                            }}
                            className="p-1 hover:bg-white/20 rounded-md transition-colors"
                          >
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                !g.expanded && "-rotate-90"
                              )}
                            />
                          </button>
                          <strong className="flex-1 text-xs font-bold tracking-wider uppercase truncate">
                            {g.name}
                          </strong>
                          <small className="text-xs font-semibold bg-black/20 px-2 py-0.5 rounded-full">
                            {completedToday}/{habits.length}
                          </small>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-white/20 rounded-md transition-colors"
                              >
                                •••
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDetail({ type: "group", id: g.id });
                                }}
                              >
                                <BarChart2 className="w-4 h-4 mr-2" /> View Stats
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditGroup(g);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteGroup(g.id);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Animated Progress Bar under Header */}
                        <div className="h-1 w-full bg-muted/40">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Habit Rows inside Group */}
                        {g.expanded && (
                          <div className="divide-y divide-border">
                            {habits.map((h) => {
                              const isDone = !!h.marks[selectedDateKey];
                              const streak = computeStreaks(h).current;

                              return (
                                <div
                                  key={h.id}
                                  className={cn(
                                    "flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/30 cursor-pointer",
                                    isDone && "bg-muted/20"
                                  )}
                                  onClick={() => toggleMark(h.id, selectedDateKey)}
                                >
                                  {/* Habit Color Dot */}
                                  <span
                                    className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorClass[h.color])}
                                  />

                                  {/* Name and streak */}
                                  <div className="flex-1 min-w-0">
                                    <div
                                      className={cn(
                                        "text-sm font-medium transition-all truncate",
                                        isDone && "line-through text-muted-foreground"
                                      )}
                                    >
                                      {h.name}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                      🔥 {streak} day streak
                                    </span>
                                  </div>

                                  {/* Action options dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                                      >
                                        •••
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDetail({ type: "habit", id: h.id });
                                        }}
                                      >
                                        <BarChart2 className="w-4 h-4 mr-2" /> View History
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditHabit(h);
                                        }}
                                      >
                                        <Pencil className="w-4 h-4 mr-2" /> Edit Habit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          confirmDeleteHabit(h.id);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {/* Circular Checkbox Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleMark(h.id, selectedDateKey);
                                    }}
                                    className={cn(
                                      "w-8 h-8 rounded-full border-2 flex items-center justify-center text-white font-bold text-sm transition-all shrink-0",
                                      isDone
                                        ? cn("border-transparent text-white", colorClass[h.color])
                                        : "border-border text-transparent hover:border-primary/60"
                                    )}
                                    aria-label={`Mark ${h.name}`}
                                  >
                                    ✓
                                  </button>
                                </div>
                              );
                            })}

                            {habits.length === 0 && (
                              <div className="py-4 text-center text-xs text-muted-foreground italic">
                                No habits in this group yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Ungrouped Habits Section */}
              {(filter === "all" || filter === "ungrouped") && ungrouped.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-3.5 py-2.5 border-b border-border bg-muted/40 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Other Habits
                  </div>
                  <div className="divide-y divide-border">
                    {ungrouped.map((h) => {
                      const isDone = !!h.marks[selectedDateKey];
                      const streak = computeStreaks(h).current;

                      return (
                        <div
                          key={h.id}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-muted/30 cursor-pointer",
                            isDone && "bg-muted/20"
                          )}
                          onClick={() => toggleMark(h.id, selectedDateKey)}
                        >
                          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorClass[h.color])} />
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "text-sm font-medium transition-all truncate",
                                isDone && "line-through text-muted-foreground"
                              )}
                            >
                              {h.name}
                            </div>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              🔥 {streak} day streak
                            </span>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                              >
                                •••
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDetail({ type: "habit", id: h.id });
                                }}
                              >
                                <BarChart2 className="w-4 h-4 mr-2" /> View History
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditHabit(h);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Edit Habit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteHabit(h.id);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMark(h.id, selectedDateKey);
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-white font-bold text-sm transition-all shrink-0",
                              isDone
                                ? cn("border-transparent text-white", colorClass[h.color])
                                : "border-border text-transparent hover:border-primary/60"
                            )}
                          >
                            ✓
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GROUPS SCREEN (s-groups) */}
          {activeTab === "groups" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Groups ({state.groups.length})
                </div>
                <Button size="sm" variant="outline" onClick={() => setGroupDialogOpen(true)} className="gap-1.5 h-8">
                  <Plus className="w-3.5 h-3.5" /> New Group
                </Button>
              </div>

              <div className="space-y-2.5">
                {state.groups.map((g) => {
                  const habits = state.habits.filter((h) => habitGroupIds(h).includes(g.id));
                  return (
                    <div
                      key={g.id}
                      onClick={() => setActiveDetail({ type: "group", id: g.id })}
                      className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:border-primary/60 cursor-pointer shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("w-3 h-3 rounded-full shrink-0", colorClass[g.color ?? "red"])} />
                        <b className="text-sm font-semibold text-foreground truncate">{g.name}</b>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground shrink-0 flex items-center gap-1">
                        {habits.length} habits ›
                      </span>
                    </div>
                  );
                })}

                {state.groups.length === 0 && (
                  <div className="text-center py-12 bg-card border border-border rounded-2xl p-6">
                    <LayoutGrid className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-foreground">No groups created yet</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">Organize your daily habits into routines</p>
                    <Button onClick={() => setGroupDialogOpen(true)}>Create First Group</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: STATS SCREEN (s-stats) */}
          {activeTab === "stats" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overview & Streaks
              </div>

              {/* Big Stats Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card border border-border rounded-2xl p-3 text-center">
                  <b className="text-xl font-bold block text-foreground">
                    {totalHabitsCount > 0 ? Math.round((markedTodayCount / totalHabitsCount) * 100) : 0}%
                  </b>
                  <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                    COMPLETION
                  </span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 text-center">
                  <b className="text-xl font-bold block text-foreground">
                    {topStreaks[0]?.streak ?? 0}
                  </b>
                  <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                    TOP STREAK
                  </span>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 text-center">
                  <b className="text-xl font-bold block text-foreground">{totalCompletions}</b>
                  <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                    POINTS
                  </span>
                </div>
              </div>

              {/* Top Streaks Leaderboard */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> Top Habit Streaks
                </div>
                <div className="space-y-2">
                  {topStreaks.map(({ habit, streak }) => (
                    <div
                      key={habit.id}
                      onClick={() => setActiveDetail({ type: "habit", id: habit.id })}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/60 hover:border-primary/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={cn("w-2.5 h-2.5 rounded-full", colorClass[habit.color])} />
                        <b className="text-sm font-medium">{habit.name}</b>
                      </div>
                      <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                        🔥 {streak}
                      </span>
                    </div>
                  ))}

                  {topStreaks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-4">No habits created yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE / SETTINGS SCREEN (s-me) */}
          {activeTab === "me" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profile & Settings
              </div>

              <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
                <div
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => navigate("/export")}
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    <div>
                      <b className="text-sm font-semibold block">Export & Backup</b>
                      <span className="text-xs text-muted-foreground">Backup JSON or sync local data</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground">›</span>
                </div>

                <div
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={toggleTheme}
                >
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                    <div>
                      <b className="text-sm font-semibold block">Theme Mode</b>
                      <span className="text-xs text-muted-foreground">Currently: {theme} mode</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs uppercase font-bold">{theme}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Floating Action Button (FAB +) */}
      {!activeDetail && (
        <button
          onClick={() => setHabitDialogOpen(true)}
          className="fixed md:absolute right-5 bottom-[96px] md:bottom-[84px] w-[52px] h-[52px] rounded-full bg-primary text-primary-foreground text-[28px] font-light flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-20"
          title="Add Habit"
        >
          +
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed md:absolute bottom-0 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 w-full max-w-[430px] flex bg-card/95 backdrop-blur-md border-t border-border py-2 px-2 z-30">
        <button
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors py-1",
            activeTab === "track" && !activeDetail ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => {
            setActiveDetail(null);
            setActiveTab("track");
          }}
        >
          <span className="text-lg leading-none">✓</span>
          Tracker
        </button>
        <button
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors py-1",
            activeTab === "groups" && !activeDetail ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => {
            setActiveDetail(null);
            setActiveTab("groups");
          }}
        >
          <span className="text-lg leading-none">▦</span>
          Groups
        </button>
        <button
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors py-1",
            activeTab === "stats" && !activeDetail ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => {
            setActiveDetail(null);
            setActiveTab("stats");
          }}
        >
          <span className="text-lg leading-none">📈</span>
          Stats
        </button>
        <button
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors py-1",
            activeTab === "me" && !activeDetail ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => {
            setActiveDetail(null);
            setActiveTab("me");
          }}
        >
          <span className="text-lg leading-none">◉</span>
          Profile
        </button>
      </nav>

      {/* DIALOGS */}

      {/* Add Habit Dialog */}
      <Dialog open={habitDialogOpen} onOpenChange={setHabitDialogOpen}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              autoFocus
              placeholder="Habit name"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
            />
            <GroupPicker groups={state.groups} selected={newHabitGroups} onChange={setNewHabitGroups} />
            <div>
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
                Color
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewHabitColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      colorClass[c],
                      newHabitColor === c
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                        : "opacity-80 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (newHabitName.trim()) {
                  addHabit(newHabitName, newHabitGroups, newHabitColor);
                  setNewHabitName("");
                  setNewHabitGroups([]);
                  setNewHabitColor("green");
                  setHabitDialogOpen(false);
                }
              }}
            >
              Add Habit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              autoFocus
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <div>
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
                Color
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewGroupColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      colorClass[c],
                      newGroupColor === c
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                        : "opacity-80 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (newGroupName.trim()) {
                  addGroup(newGroupName, newGroupColor);
                  setNewGroupName("");
                  setNewGroupColor("slate");
                  setGroupDialogOpen(false);
                }
              }}
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Habit Dialog */}
      <Dialog open={!!editHabit} onOpenChange={(o) => !o && setEditHabit(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              autoFocus
              placeholder="Habit name"
              value={editHabitName}
              onChange={(e) => setEditHabitName(e.target.value)}
            />
            <GroupPicker groups={state.groups} selected={editHabitGroups} onChange={setEditHabitGroups} />
            <div>
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
                Color
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditHabitColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      colorClass[c],
                      editHabitColor === c
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                        : "opacity-80 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (!editHabit) return;
                updateHabit(editHabit.id, {
                  name: editHabitName.trim() || editHabit.name,
                  color: editHabitColor,
                  groupIds: editHabitGroups,
                });
                setEditHabit(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={(o) => !o && setEditGroup(null)}>
        <DialogContent className="max-w-[380px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              autoFocus
              placeholder="Group name"
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
            />
            <div>
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">
                Color
              </div>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditGroupColor(c)}
                    aria-label={`Color ${c}`}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all",
                      colorClass[c],
                      editGroupColor === c
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                        : "opacity-80 hover:opacity-100"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (!editGroup) return;
                updateGroup(editGroup.id, {
                  name: editGroupName.trim() || editGroup.name,
                  color: editGroupColor,
                });
                setEditGroup(null);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.type === "group" ? "group" : "habit"}?`}
        description={`Are you sure you want to delete "${pendingDelete?.name ?? ""}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete"
      />
    </div>
  );
};

const GroupPicker = ({
  groups,
  selected,
  onChange,
}: {
  groups: { id: string; name: string; color?: HabitColor }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) => {
  if (groups.length === 0) {
    return <div className="text-xs text-muted-foreground">No groups yet</div>;
  }
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id]);
  const selectedGroups = groups.filter((g) => selected.includes(g.id));
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-semibold">
        Groups (optional)
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:border-primary"
          >
            <span className={cn("truncate", selectedGroups.length === 0 && "text-muted-foreground")}>
              {selectedGroups.length === 0
                ? "Select groups"
                : selectedGroups.map((g) => g.name).join(", ")}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[14rem]">
          {groups.map((g) => {
            const active = selected.includes(g.id);
            return (
              <DropdownMenuItem
                key={g.id}
                onSelect={(e) => {
                  e.preventDefault();
                  toggle(g.id);
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className={cn(
                    "flex w-4 h-4 items-center justify-center rounded border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  )}
                >
                  {active && <Check className="w-3 h-3" />}
                </span>
                <span className={cn("w-2 h-2 rounded-full", colorClass[g.color ?? "slate"])} />
                <span className={cn("uppercase tracking-wider text-xs", active && "text-primary font-semibold")}>
                  {g.name}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default HabitTracker;
