import { useEffect, useState } from "react";

const STORAGE_KEY = "habits-tracker-state-v1";
const ENABLED_KEY = "habits-auto-backup-enabled";
const LAST_KEY = "habits-auto-backup-last";

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isAutoBackupEnabled = () => localStorage.getItem(ENABLED_KEY) === "1";

export const getLastBackup = () => localStorage.getItem(LAST_KEY);

const download = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const runBackup = (day: string) => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  download(
    JSON.stringify({ exportedAt: new Date().toISOString(), ...(parsed as object) }, null, 2),
    `rojroutine-backup-${day}.json`,
  );
  localStorage.setItem(LAST_KEY, day);
  return true;
};

/**
 * Downloads a JSON backup of the tracker data once per day, on/after midnight,
 * whenever the app is open (or on the next visit if it was closed).
 */
let schedulerActive = false;

export function useAutoBackup(options?: { schedule?: boolean }) {
  const schedule = options?.schedule ?? true;
  const [enabled, setEnabled] = useState(() => isAutoBackupEnabled());
  const [lastBackup, setLastBackup] = useState<string | null>(() => getLastBackup());

  useEffect(() => {
    localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !schedule) return;
    if (schedulerActive) return;
    schedulerActive = true;

    const check = () => {
      const today = dateKey(new Date());
      if (localStorage.getItem(LAST_KEY) === today) return;
      if (runBackup(today)) setLastBackup(today);
    };

    check();
    const interval = setInterval(check, 60 * 1000);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      schedulerActive = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, schedule]);

  return { enabled, setEnabled, lastBackup };
}
