import { LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SignIn = () => {
  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Sign in failed", { description: error.message });
    }
  };

  return (
    <div className="mobile-app-frame mx-auto flex flex-col items-center justify-center p-6 text-center shadow-2xl">
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          ✓
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">RojRoutine</h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Track your habits, build daily routines, and keep your streak going strong.
          </p>
        </div>
        <Button onClick={handleGoogle} size="lg" className="w-full gap-2 font-semibold rounded-xl">
          <LogIn className="w-4 h-4" />
          Continue with Google
        </Button>
      </div>
    </div>
  );
};

export default SignIn;
