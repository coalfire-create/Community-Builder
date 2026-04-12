import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, Upload, X, Info, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const formSchema = z.object({
  studentId: z.string().min(5, "올바른 학번을 입력해주세요"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
  name: z.string().min(2, "이름을 입력해주세요"),
});

type CheckResult = "unchecked" | "checking" | "allowed" | "needs-verification";

export function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult>("unchecked");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { studentId: "", password: "", name: "" },
  });

  const studentId = form.watch("studentId");

  const checkStudentId = useCallback(async (id: string) => {
    if (id.length < 5) {
      setCheckResult("unchecked");
      return;
    }
    setCheckResult("checking");
    try {
      const res = await fetch(`/api/auth/check-student-id?studentId=${encodeURIComponent(id)}`);
      const data = await res.json();
      setCheckResult(data.allowed ? "allowed" : "needs-verification");
    } catch {
      setCheckResult("unchecked");
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkStudentId(studentId);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [studentId, checkStudentId]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (checkResult === "needs-verification" && !imageBase64) {
      toast({
        variant: "destructive",
        title: "사진 인증 필요",
        description: "학생정보시스템(msi.mju.ac.kr) 화면 사진을 업로드해주세요.",
      });
      return;
    }

    setIsPending(true);
    try {
      const body: Record<string, unknown> = {
        ...values,
        department: "기계시스템공학과",
      };
      if (imageBase64) body.verificationImage = imageBase64;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "회원가입 실패",
          description: data.message || "입력한 정보를 확인해주세요.",
        });
        return;
      }

      queryClient.setQueryData(getGetMeQueryKey(), data.user);
      setLocation("/feed");
    } catch {
      toast({
        variant: "destructive",
        title: "오류",
        description: "서버와 통신 중 오류가 발생했습니다.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            회원가입
          </h1>
          <p className="text-sm text-muted-foreground">
            기계시스템공학과 커뮤니티에 가입하세요
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="학번"
                        {...field}
                        className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {checkResult === "checking" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>학번 확인 중...</span>
                </div>
              )}
              {checkResult === "allowed" && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 px-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>1학년 사전 등록 학번입니다. 바로 가입 가능합니다.</span>
                </div>
              )}
              {checkResult === "needs-verification" && (
                <div className="flex items-center gap-1.5 text-xs text-primary px-1">
                  <Info className="h-3.5 w-3.5" />
                  <span>2학년 이상 학생은 학생정보시스템 사진 인증이 필요합니다.</span>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="password" placeholder="비밀번호" {...field} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="실명" {...field} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {checkResult === "needs-verification" && (
              <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="text-xs text-foreground/70 leading-relaxed">
                  <span className="font-semibold text-primary">사진 인증 필요</span>
                  <br />
                  명지대학교 학생정보시스템(msi.mju.ac.kr) → 학적/장학 → 학생카드 화면에서
                  <span className="font-medium"> 학번과 학부(기계공학부)가 모두 보이는 스크린샷</span>을 업로드해주세요.
                </div>

                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="인증 사진" className="w-full rounded-lg object-contain max-h-40 border border-border" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-1.5 right-1.5 bg-background/80 rounded-full p-0.5 hover:bg-background shadow"
                    >
                      <X className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-4 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">사진 선택</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl"
              disabled={isPending || checkResult === "checking"}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {checkResult === "needs-verification" ? "사진 인증 중..." : "가입 중..."}
                </span>
              ) : "회원가입"}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
            이미 계정이 있으신가요? 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
