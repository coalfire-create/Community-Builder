import { useListUsers, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  student: "일반 학생",
  council: "학생회",
  admin: "관리자",
};

const ROLE_COLORS: Record<string, string> = {
  student: "text-muted-foreground bg-muted",
  council: "text-primary bg-primary/10 border border-primary/20",
  admin: "text-orange-600 bg-orange-50 border border-orange-200",
};

export function Admin() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers();

  const { mutate: updateRole, isPending: isUpdating } = useUpdateUserRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "권한이 변경되었습니다" });
      },
      onError: () => {
        toast({ variant: "destructive", title: "권한 변경에 실패했습니다" });
      }
    }
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4">
        <Shield className="h-10 w-10 mb-3 opacity-30" />
        <p>관리자만 접근할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={() => setLocation("/feed")} className="p-1 hover:bg-muted rounded-md transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium">관리자 패널</span>
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-sm text-muted-foreground mb-4">전체 사용자 목록. 학생 ↔ 학생회 권한을 변경할 수 있습니다.</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {users?.map((u: any) => (
              <div key={u.id} className="bg-background rounded-xl border border-border p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{u.studentId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    가입: {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true, locale: ko })}
                  </div>
                </div>

                {u.role !== "admin" && (
                  <div className="shrink-0">
                    {u.role === "student" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRole({ userId: u.id, data: { role: "council" } })}
                        disabled={isUpdating}
                        className="h-8 text-xs border-primary text-primary hover:bg-primary/10"
                      >
                        학생회로 승격
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRole({ userId: u.id, data: { role: "student" } })}
                        disabled={isUpdating}
                        className="h-8 text-xs"
                      >
                        일반으로 강등
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
