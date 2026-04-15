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
import { useState, useRef } from "react";
import { Upload, X, Loader2, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const formSchema = z.object({
  studentId: z.string().min(5, "올바른 학번을 입력해주세요"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
  name: z.string().min(2, "이름을 입력해주세요"),
});

export function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { studentId: "", password: "", name: "" },
  });

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
    if (!imageBase64) {
      toast({
        variant: "destructive",
        title: "사진 인증 필요",
        description: "학생정보시스템 화면 사진을 업로드해주세요.",
      });
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          department: "기계시스템공학과",
          verificationImage: imageBase64,
        }),
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
          <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-md">
            <img src="/logo.jpg" alt="로고" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">회원가입</h1>
          <p className="text-sm text-muted-foreground">
            명지대 기계시스템공학과 학생 전용 커뮤니티
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="비밀번호"
                      {...field}
                      className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                    />
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
                    <Input
                      placeholder="실명"
                      {...field}
                      className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* AI 인증 섹션 - 항상 표시 */}
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-foreground/70 leading-relaxed">
                  <span className="font-semibold text-primary">AI 재학 인증 필수</span>
                  <br />
                  명지대학교 학생정보시스템(msi.mju.ac.kr) →{" "}
                  학적/장학 → 학생카드 화면에서{" "}
                  <span className="font-medium text-foreground">
                    학번과 학부(기계공학부)가 모두 보이는 스크린샷
                  </span>
                  을 업로드하세요.
                </div>
              </div>

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="인증 사진"
                    className="w-full rounded-lg object-contain max-h-44 border border-border"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-1.5 right-1.5 bg-background/90 rounded-full p-0.5 hover:bg-background shadow"
                  >
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-5 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">학생카드 사진 선택</span>
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

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium rounded-xl"
              disabled={isPending || !imageBase64}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI 인증 중... (10~20초 소요)
                </span>
              ) : (
                "가입하기"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
          >
            이미 계정이 있으신가요? 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
