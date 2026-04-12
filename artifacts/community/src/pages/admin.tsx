import { useListUsers, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, UserCheck, Plus, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

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

type AllowedId = { id: number; studentId: string; note: string | null; createdAt: string };

function AllowedStudentIdSection() {
  const { toast } = useToast();
  const [list, setList] = useState<AllowedId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchList() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/allowed-student-ids", { credentials: "include" });
      const data = await res.json();
      setList(data);
    } catch {
      toast({ variant: "destructive", title: "목록 불러오기 실패" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  async function handleAdd() {
    const ids = inputText.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/allowed-student-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "추가 실패", description: data.message });
        return;
      }
      toast({ title: `${data.inserted.length}개 학번 추가됨` });
      setInputText("");
      fetchList();
    } catch {
      toast({ variant: "destructive", title: "오류 발생" });
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(studentId: string) {
    setDeletingId(studentId);
    try {
      const res = await fetch(`/api/admin/allowed-student-ids/${encodeURIComponent(studentId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "삭제 실패" });
        return;
      }
      setList(prev => prev.filter(i => i.studentId !== studentId));
      toast({ title: "삭제되었습니다" });
    } catch {
      toast({ variant: "destructive", title: "오류 발생" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">1학년 사전 등록 학번</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{list.length}개</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        등록된 학번은 사진 인증 없이 바로 가입할 수 있습니다. (1학년 대상)<br />
        여러 학번을 한 번에 추가하려면 줄 바꿈 또는 쉼표로 구분해 입력하세요.
      </p>

      <div className="space-y-2 mb-4">
        <Textarea
          placeholder={"학번 입력 (여러 개는 줄바꿈 또는 쉼표로 구분)\n예:\n60261234\n60265678"}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="text-sm font-mono resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          rows={3}
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={isAdding || !inputText.trim()}
          className="w-full h-9 gap-1.5"
        >
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          학번 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          등록된 학번이 없습니다
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {list.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-background rounded-lg border border-border px-3 py-2">
              <div>
                <span className="text-sm font-mono font-medium">{item.studentId}</span>
                {item.note && <span className="text-xs text-muted-foreground ml-2">({item.note})</span>}
              </div>
              <button
                onClick={() => handleDelete(item.studentId)}
                disabled={deletingId === item.studentId}
                className="p-1 hover:bg-red-50 hover:text-red-600 rounded transition-colors text-muted-foreground disabled:opacity-50"
              >
                {deletingId === item.studentId
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Trash2 className="h-3.5 w-3.5" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <div>
          <h2 className="text-sm font-semibold mb-1">사용자 관리</h2>
          <p className="text-xs text-muted-foreground mb-3">학생 ↔ 학생회 권한을 변경할 수 있습니다.</p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {users?.map((u: any) => (
                <div key={u.id} className="bg-background rounded-xl border border-border p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-mono font-medium text-foreground truncate">{u.studentId}</span>
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
                          학생회 승격
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRole({ userId: u.id, data: { role: "student" } })}
                          disabled={isUpdating}
                          className="h-8 text-xs"
                        >
                          일반 강등
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border mt-6 pt-1">
          <AllowedStudentIdSection />
        </div>
      </div>
    </div>
  );
}
