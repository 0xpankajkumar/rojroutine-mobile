import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import StatsView from "@/components/StatsView";
import StatsPageShell, { StatsNotFound } from "@/components/StatsPageShell";
import { useTracker } from "@/lib/use-tracker";
import { colorClass, habitGroupIds } from "@/lib/habits-types";
import { cn } from "@/lib/utils";

const GroupStats = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useTracker();
  const group = state.groups.find((g) => g.id === id);
  const habits = useMemo(
    () => state.habits.filter((h) => (id ? habitGroupIds(h).includes(id) : false)),
    [state.habits, id],
  );

  // A day counts for the group when every habit in the group is marked.
  const marks = useMemo(() => {
    if (habits.length === 0) return {} as Record<string, boolean>;
    const result: Record<string, boolean> = {};
    const keys = new Set<string>();
    habits.forEach((h) =>
      Object.keys(h.marks).forEach((k) => {
        if (h.marks[k]) keys.add(k);
      }),
    );
    keys.forEach((k) => {
      if (habits.every((h) => h.marks[k])) result[k] = true;
    });
    return result;
  }, [habits]);

  const totalCompletions = state.habits.reduce((s, h) => s + Object.keys(h.marks).length, 0);

  if (!group) return <StatsNotFound label="Group not found." />;

  return (
    <StatsPageShell totalCompletions={totalCompletions}>
      <StatsView
        title={group.name}
        subtitle="A day counts when every habit in this group is marked."
        color={group.color ?? "green"}
        marks={marks}
      >
        <div className="mb-10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Habits in this group ({habits.length})
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No habits in this group yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {habits.map((h) => (
                <Link
                  key={h.id}
                  to={`/habit/${h.id}`}
                  className="rounded-md border border-border p-3 flex items-center gap-3 hover:border-primary transition-colors"
                >
                  <span className={cn("w-3 h-3 rounded-full shrink-0", colorClass[h.color])} />
                  <span className="text-sm truncate">{h.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </StatsView>
    </StatsPageShell>
  );
};

export default GroupStats;
