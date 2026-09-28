import { useEffect, useRef, useState } from "react";
import { Habit, HabitColor, HabitGroup, TrackerState, COLOR_OPTIONS, habitGroupIds } from "./habits-types";
import { toKey, today, uid } from "./habits-utils";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "habits-tracker-state-v1";

const seed = (): TrackerState => {
  const t = today();
  const g1: HabitGroup = { id: uid(), name: "DAILY GOALS", expanded: true };
  const g2: HabitGroup = { id: uid(), name: "HEALTH", expanded: true };
  const habits: Habit[] = [
    { id: uid(), name: "Read 20 pages", color: "green", groupIds: [g1.id], createdAt: toKey(t), marks: {} },
    { id: uid(), name: "Meditate", color: "purple", groupIds: [g1.id], createdAt: toKey(t), marks: {} },
    { id: uid(), name: "Workout", color: "orange", groupIds: [g2.id], createdAt: toKey(t), marks: {} },
    { id: uid(), name: "Drink water", color: "blue", groupIds: [g2.id], createdAt: toKey(t), marks: {} },
    { id: uid(), name: "Sleep 8h", color: "teal", groupIds: [], createdAt: toKey(t), marks: {} },
  ];
  return { groups: [g1, g2], habits, selectedDate: toKey(t) };
};

const normalize = (s: TrackerState): TrackerState => ({
  ...s,
  habits: (s.habits ?? []).map((h) => ({ ...h, groupIds: habitGroupIds(h) })),
});

const loadLocal = (): TrackerState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return seed();
};

export function useTracker() {
  const [state, setState] = useState<TrackerState>(() => loadLocal());
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const skipNextSaveRef = useRef(false);
  // Cloud writes are blocked until the signed-in user's cloud state has been
  // loaded, so a stale/empty local state can never overwrite good server data.
  const cloudReadyRef = useRef(false);

  // Track auth session
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // When user logs in: load cloud state (or seed it from local on first sign-in)
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    cloudReadyRef.current = false;
    setLoadingCloud(true);
    (async () => {
      const { data, error } = await supabase
        .from("tracker_states")
        .select("state")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // Could not read the cloud state — stay read-only to avoid data loss.
        setLoadingCloud(false);
        return;
      }
      if (data?.state && Object.keys(data.state as object).length > 0) {
        skipNextSaveRef.current = true;
        setState(normalize(data.state as unknown as TrackerState));
      } else {
        // No cloud state yet — push current (local) state to cloud
        const local = state;
        await supabase
          .from("tracker_states")
          .upsert([{ user_id: userId, state: local as unknown as never }]);
      }
      cloudReadyRef.current = true;
      setLoadingCloud(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Persist to localStorage (always) and cloud (when logged in)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!userId) return;
    if (!cloudReadyRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      (async () => {
        // Last-chance guard: never replace a bigger cloud state with a state
        // that lost habits we never had in this session.
        const { data, error } = await supabase
          .from("tracker_states")
          .select("state")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) return;
        const remote = (data?.state as unknown as TrackerState | undefined) ?? undefined;
        const remoteIds = new Set((remote?.habits ?? []).map((h) => h.id));
        const localIds = new Set(state.habits.map((h) => h.id));
        const unknownMissing = [...remoteIds].filter((id) => !localIds.has(id));
        // Habits present on the server but never loaded locally => stale client.
        if (remoteIds.size > 0 && unknownMissing.length > 0 && localIds.size === 0) return;
        await supabase
          .from("tracker_states")
          .upsert([{ user_id: userId, state: state as unknown as never }]);
      })();
    }, 400);
    return () => clearTimeout(t);
  }, [state, userId]);


  const toggleMark = (habitId: string, dateKey: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const next = { ...h.marks };
        if (next[dateKey]) delete next[dateKey];
        else next[dateKey] = true;
        return { ...h, marks: next };
      }),
    }));
  };

  const addHabit = (name: string, groupIds: string[], color?: HabitColor) => {
    if (!name.trim()) return;
    const used = new Set(state.habits.map((h) => h.color));
    const chosen: HabitColor =
      color ??
      COLOR_OPTIONS.find((c) => !used.has(c)) ??
      COLOR_OPTIONS[state.habits.length % COLOR_OPTIONS.length];
    const habit: Habit = {
      id: uid(),
      name: name.trim(),
      color: chosen,
      groupIds,
      createdAt: toKey(today()),
      marks: {},
    };
    setState((s) => ({ ...s, habits: [...s.habits, habit] }));
  };

  const addGroup = (name: string, color?: HabitColor) => {
    if (!name.trim()) return;
    setState((s) => ({
      ...s,
      groups: [...s.groups, { id: uid(), name: name.trim().toUpperCase(), expanded: true, color }],
    }));
  };

  const updateGroup = (id: string, updates: Partial<Pick<HabitGroup, "name" | "color">>) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) =>
        g.id === id
          ? { ...g, ...updates, name: updates.name ? updates.name.trim().toUpperCase() : g.name }
          : g
      ),
    }));
  };

  const toggleGroup = (groupId: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === groupId ? { ...g, expanded: !g.expanded } : g)),
    }));
  };

  const renameHabit = (id: string, name: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === id ? { ...h, name } : h)),
    }));
  };

  const updateHabit = (id: string, updates: Partial<Pick<Habit, "name" | "color" | "groupIds">>) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }));
  };

  const renameGroup = (id: string, name: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === id ? { ...g, name: name.trim().toUpperCase() } : g)),
    }));
  };

  const deleteHabit = (id: string) => {
    setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
  };

  const deleteGroup = (id: string) => {
    setState((s) => ({
      ...s,
      groups: s.groups.filter((g) => g.id !== id),
      habits: s.habits.map((h) => ({
        ...h,
        groupIds: habitGroupIds(h).filter((gid) => gid !== id),
      })),
    }));
  };

  const setSelectedDate = (key: string) =>
    setState((s) => ({ ...s, selectedDate: key }));

  const reorderHabit = (sourceId: string, targetId: string, position: "above" | "below" = "above") => {
    if (sourceId === targetId) return;
    setState((s) => {
      const src = s.habits.find((h) => h.id === sourceId);
      const tgt = s.habits.find((h) => h.id === targetId);
      if (!src || !tgt) return s;
      const moved = { ...src };
      const without = s.habits.filter((h) => h.id !== sourceId);
      const targetIdx = without.findIndex((h) => h.id === targetId);
      const insertIdx = position === "below" ? targetIdx + 1 : targetIdx;
      const next = [...without];
      next.splice(insertIdx, 0, moved);
      return { ...s, habits: next };
    });
  };

  const addHabitToGroup = (habitId: string, groupId: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) =>
        h.id === habitId && !habitGroupIds(h).includes(groupId)
          ? { ...h, groupIds: [...habitGroupIds(h), groupId] }
          : h
      ),
    }));
  };

  const removeHabitFromGroup = (habitId: string, groupId: string) => {
    setState((s) => ({
      ...s,
      habits: s.habits.map((h) =>
        h.id === habitId
          ? { ...h, groupIds: habitGroupIds(h).filter((g) => g !== groupId) }
          : h
      ),
    }));
  };

  return {
    state,
    userId,
    loadingCloud,
    toggleMark,
    addHabit,
    addGroup,
    toggleGroup,
    renameHabit,
    updateHabit,
    renameGroup,
    updateGroup,
    deleteHabit,
    deleteGroup,
    setSelectedDate,
    reorderHabit,
    addHabitToGroup,
    removeHabitFromGroup,
  };
}
