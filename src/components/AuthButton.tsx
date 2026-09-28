import { useEffect, useState } from "react";
import { LogOut, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const AuthButton = () => {
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const apply = (session: { user?: { email?: string | null; user_metadata?: Record<string, unknown> } } | null) => {
      setEmail(session?.user?.email ?? null);
      const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const url = (meta.avatar_url as string) || (meta.picture as string) || null;
      setAvatar(url);
    };
    supabase.auth.getSession().then(({ data: { session } }) => apply(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
  };

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Account menu"
        >
          <Avatar className="w-8 h-8">
            {avatar && <AvatarImage src={avatar} alt={email} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/export">
            <Download className="w-4 h-4 mr-2" />
            Export data
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthButton;
