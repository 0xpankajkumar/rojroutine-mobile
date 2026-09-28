import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthButton from "@/components/AuthButton";
import { useTheme } from "@/lib/use-theme";

interface StatsPageShellProps {
  totalCompletions: number;
  children: ReactNode;
}

const StatsPageShell = ({ totalCompletions, children }: StatsPageShellProps) => {
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="mobile-app-frame mx-auto shadow-2xl transition-all">
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-2.5 sticky top-0 bg-background/95 backdrop-blur-md z-30 border-b border-border/40">
        <Link to="/" className="w-[28px] h-[28px] bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
          ✓
        </Link>
        <Link to="/" className="text-xl font-bold flex-1 tracking-tight text-foreground">
          RojRoutine
        </Link>
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

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to tracker
        </Link>
        {children}
      </main>
    </div>
  );
};

export const StatsNotFound = ({ label }: { label: string }) => (
  <div className="mobile-app-frame mx-auto flex flex-col items-center justify-center p-6 text-center">
    <p className="text-sm text-muted-foreground mb-4">{label}</p>
    <Button asChild variant="outline">
      <Link to="/">Back to tracker</Link>
    </Button>
  </div>
);

export default StatsPageShell;
