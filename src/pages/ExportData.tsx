import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTracker } from "@/lib/use-tracker";
import { toast } from "sonner";
import type { Habit } from "@/lib/habits-types";
import { Switch } from "@/components/ui/switch";
import { useAutoBackup, runBackup } from "@/lib/use-auto-backup";

const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const escapeCsv = (val: string) => {
  if (/[",\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
};

const ExportData = () => {
  const navigate = useNavigate();
  const { state } = useTracker();
  const [profile, setProfile] = useState<{ email: string | null; full_name: string | null }>({
    email: null,
    full_name: null,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const { enabled, setEnabled, lastBackup } = useAutoBackup({ schedule: false });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile({
        email: data?.email ?? user.email ?? null,
        full_name:
          data?.full_name ??
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          null,
      });
    });
  }, [navigate]);

  const buildPayload = () => ({
    exportedAt: new Date().toISOString(),
    user: { id: userId, email: profile.email, name: profile.full_name },
    groups: state.groups,
    habits: state.habits,
  });

  const exportJson = () => {
    downloadBlob(
      JSON.stringify(buildPayload(), null, 2),
      `habits-export-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
    toast.success("JSON exported");
  };

  const exportCsv = () => {
    const groupMap = new Map(state.groups.map((g) => [g.id, g.name]));
    const rows: string[] = ["Habit,Group,Color,Created At,Date,Completed"];
    state.habits.forEach((h: Habit) => {
      const group = h.groupId ? groupMap.get(h.groupId) ?? "" : "";
      const entries = Object.entries(h.marks);
      if (entries.length === 0) {
        rows.push(
          [h.name, group, h.color, h.createdAt, "", ""].map((v) => escapeCsv(String(v))).join(",")
        );
      } else {
        entries
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, done]) => {
            rows.push(
              [h.name, group, h.color, h.createdAt, date, done ? "yes" : "no"]
                .map((v) => escapeCsv(String(v)))
                .join(",")
            );
          });
      }
    });
    downloadBlob(
      rows.join("\n"),
      `habits-export-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv"
    );
    toast.success("CSV exported");
  };

  const totalMarks = state.habits.reduce((n, h) => n + Object.keys(h.marks).length, 0);

  return (
    <div className="mobile-app-frame mx-auto shadow-2xl transition-all">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-2.5 sticky top-0 bg-background/95 backdrop-blur-md z-30 border-b border-border/40">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link to="/" aria-label="Back">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold flex-1 tracking-tight text-foreground">Export Data</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Card className="p-4 rounded-2xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Account</h2>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Name: </span>
              <span className="font-medium">{profile.full_name ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium">{profile.email ?? "—"}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Summary</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xl font-bold">{state.groups.length}</div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Groups</div>
            </div>
            <div>
              <div className="text-xl font-bold">{state.habits.length}</div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Habits</div>
            </div>
            <div>
              <div className="text-xl font-bold">{totalMarks}</div>
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">Check-ins</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold">Daily auto-backup</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically download backup files locally upon opening app after midnight.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Last backup: {lastBackup ?? "—"}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v);
                toast.success(v ? "Daily auto-backup on" : "Daily auto-backup off");
              }}
              aria-label="Daily auto-backup"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs font-semibold"
            onClick={() => {
              const ok = runBackup(new Date().toISOString().slice(0, 10));
              toast[ok ? "success" : "error"](ok ? "Backup downloaded" : "Nothing to back up");
            }}
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            Backup now
          </Button>
        </Card>

        <Card className="p-4 rounded-2xl space-y-3">
          <div>
            <h2 className="text-sm font-bold">Download Files</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export groups, habits and daily check-ins to local file.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportJson} size="sm" className="w-full text-xs font-semibold">
              <FileJson className="w-3.5 h-3.5 mr-1.5" />
              JSON
            </Button>
            <Button onClick={exportCsv} variant="outline" size="sm" className="w-full text-xs font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              CSV
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ExportData;
