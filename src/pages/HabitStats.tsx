import { useParams } from "react-router-dom";
import StatsView from "@/components/StatsView";
import StatsPageShell, { StatsNotFound } from "@/components/StatsPageShell";
import { useTracker } from "@/lib/use-tracker";

const HabitStats = () => {
  const { id } = useParams<{ id: string }>();
  const { state } = useTracker();
  const habit = state.habits.find((h) => h.id === id);

  const totalCompletions = state.habits.reduce((s, h) => s + Object.keys(h.marks).length, 0);

  if (!habit) return <StatsNotFound label="Habit not found." />;

  return (
    <StatsPageShell totalCompletions={totalCompletions}>
      <StatsView title={habit.name} color={habit.color} marks={habit.marks} />
    </StatsPageShell>
  );
};

export default HabitStats;
