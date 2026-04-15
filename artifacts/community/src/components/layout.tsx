import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { mutate: logoutMutation } = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-sm">
        <div className="relative max-w-lg mx-auto px-4 h-14 flex items-center justify-center">
          <Link href="/feed" className="flex flex-col items-center gap-0.5">
            <img
              src="/mju-logo.png"
              alt="명지대학교"
              className="h-6 object-contain brightness-0 invert"
            />
            <div className="font-semibold text-xs tracking-tight text-primary-foreground/90">
              기계시스템공학과 커뮤니티
            </div>
          </Link>
          <div className="absolute right-4 flex items-center gap-1">
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
                  title="관리자 패널"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
              title="로그아웃"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto p-0 bg-background min-h-[calc(100vh-3.5rem)] shadow-sm">
        {children}
      </main>
    </div>
  );
}
