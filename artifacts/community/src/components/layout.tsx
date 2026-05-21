import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { LogOut, Shield, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { mutate: logoutMutation } = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = () => {
    logoutMutation(undefined, {
      onSuccess: () => {
        logout();
        queryClient.clear();
        toast({ title: "로그아웃 되었습니다" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/50 to-slate-100 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950">
      
      {/* Top Glassmorphism Header */}
      <header className="sticky top-0 z-50 w-full bg-primary/95 dark:bg-slate-900/95 backdrop-blur-md text-primary-foreground border-b border-primary-border/20 dark:border-slate-800/80 shadow-sm transition-all">
        <div className="relative max-w-lg mx-auto px-4 h-16 flex items-center justify-center">
          <Link href="/feed" className="flex flex-col items-center gap-0.5 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer">
            <img
              src="/mju-logo.png"
              alt="명지대학교"
              className="h-7 object-contain brightness-0 invert"
            />
            <div className="font-bold text-[10px] tracking-wider text-primary-foreground/80 uppercase">
              기계시스템공학과 커뮤니티
            </div>
          </Link>
          <div className="absolute right-4 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="text-primary-foreground hover:bg-primary-foreground/15 dark:hover:bg-slate-800 h-9 w-9 rounded-xl transition-all"
              title="테마 변경"
            >
              {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </Button>
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/15 dark:hover:bg-slate-800 h-9 w-9 rounded-xl transition-all"
                  title="관리자 패널"
                >
                  <Shield className="h-4.5 w-4.5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/15 dark:hover:bg-slate-800 h-9 w-9 rounded-xl transition-all"
              title="로그아웃"
            >
              <LogOut className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <main className="max-w-lg mx-auto p-0 bg-background min-h-[calc(100vh-4rem)] shadow-md border-x border-border/60 relative">
        {children}
      </main>
    </div>
  );
}
