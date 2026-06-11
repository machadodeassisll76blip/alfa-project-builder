import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FolderKanban, Sparkles, Layers, Shield } from "lucide-react";
import { amIAdmin } from "@/lib/admin.functions";

export function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const checkAdmin = useServerFn(amIAdmin);

  useEffect(() => {
    const refresh = async (session: { user: { email?: string | null } } | null) => {
      setEmail(session?.user.email ?? null);
      if (session?.user) {
        try {
          const { isAdmin: ok } = await checkAdmin();
          setIsAdmin(ok);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    supabase.auth.getSession().then(({ data }) => refresh(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      refresh(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            hash="planos"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Planos
          </Link>
          <Link
            to="/templates"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Layers className="mr-1 inline h-4 w-4" />
            Templates
          </Link>
          {email && (
            <>
              <Link
                to="/projetos"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <FolderKanban className="mr-1 inline h-4 w-4" />
                Meus projetos
              </Link>
              <Link
                to="/editor"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LayoutDashboard className="mr-1 inline h-4 w-4" />
                Editor
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Sparkles className="mr-1 h-4 w-4" /> Começar grátis
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
