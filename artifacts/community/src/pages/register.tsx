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
import { Upload, X, Loader2, ShieldCheck, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type Grade = "1" | "2+" | null;

const formSchema = z.object({
  studentId: z.string().min(5, "올바른 학번 또는 전화번호를 입력해주세요"),
  name: z.string().min(2, "이름을 입력해주세요"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
});

export function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [grade, setGrade] = useState<Grade>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { studentId: "", name: "", password: "" },
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

  function handleGradeSelect(selected: Grade) {
    setGrade(selected);
    form.reset({ studentId: "", name: "", password: "" });
    clearImage();
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!grade) return;

    if (grade === "2+" && !imageBase64) {
      toast({
        variant: "destructive",
        title: "사진 인증 필요",
        description: "학생카드 사진을 업로드해주세요.",
      });
      return;
    }

    setIsPending(true);
    try {
      const body: Record<string, unknown> = {
        ...values,
        department: "기계시스템공학과",
        grade,
      };
      if (grade === "2+") {
        body.verificationImage = imageBase64;
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
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

  const isUpperGrade = grade === "2+";
  const canSubmit = grade === "1" || (isUpperGrade && !!imageBase64);

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 text-slate-100 px-4 py-12 relative overflow-hidden">
      
      {/* Glow Effects */}
      <div className="absolute top-[10%] left-[5%] w-72 h-72 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-72 h-72 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center gap-3">
            <img
              src="/mju-logo.png"
              alt="명지대학교"
              className="h-9 object-contain brightness-0 invert"
            />
            <div className="w-px h-5 bg-slate-800" />
            <div className="mx-auto w-8 h-8 rounded-lg overflow-hidden shadow-md border border-slate-800">
              <img src="/logo.jpg" alt="로고" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">회원가입</h1>
            <p className="text-xs text-slate-400">
              명지대 기계시스템공학과 학생 전용 커뮤니티
            </p>
          </div>
        </div>

        {/* Grade Selection */}
        <div className="space-y-3 p-5 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md shadow-xl">
          <p className="text-xs font-semibold text-center text-slate-300">가입 구분을 선택해주세요</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleGradeSelect("1")}
              className={cn(
                "flex flex-col items-center gap-2 py-4 rounded-xl border transition-all font-medium text-xs cursor-pointer",
                grade === "1"
                  ? "border-primary bg-primary/20 text-primary-foreground shadow-md shadow-primary/10"
                  : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              )}
            >
              <GraduationCap className={cn("h-5 w-5", grade === "1" ? "text-primary" : "text-slate-500")} />
              <span className="font-bold">공과대학 광역</span>
              <span className="text-[10px] opacity-80 text-center font-normal px-1">
                전화번호/실명 가입
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleGradeSelect("2+")}
              className={cn(
                "flex flex-col items-center gap-2 py-4 rounded-xl border transition-all font-medium text-xs cursor-pointer",
                grade === "2+"
                  ? "border-primary bg-primary/20 text-primary-foreground shadow-md shadow-primary/10"
                  : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              )}
            >
              <ShieldCheck className={cn("h-5 w-5", grade === "2+" ? "text-primary" : "text-slate-500")} />
              <span className="font-bold">기계과 (광역 제외)</span>
              <span className="text-[10px] opacity-80 text-center font-normal px-1">
                학생카드 인증 필요
              </span>
            </button>
          </div>
        </div>

        {/* Form — shown after grade selected */}
        {grade && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md shadow-xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder={grade === "1" ? "전화번호 (예: 010-XXXX-XXXX)" : "학번"}
                          {...field}
                          className="h-12 bg-slate-900/60 border-slate-800 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-slate-100 placeholder:text-slate-500 rounded-xl"
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
                          className="h-12 bg-slate-900/60 border-slate-800 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-slate-100 placeholder:text-slate-500 rounded-xl"
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
                          autoComplete="new-password"
                          {...field}
                          className="h-12 bg-slate-900/60 border-slate-800 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-slate-100 placeholder:text-slate-500 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 기계과(광역 제외) 이미지 인증 섹션 */}
                {isUpperGrade && (
                  <div className="rounded-xl border border-dashed border-primary/40 bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        <span className="font-semibold text-primary">AI 재학 인증 필수</span>
                        <br />
                        명지대학교 학생정보시스템(msi.mju.ac.kr) →{" "}
                        학적/장학 → 학생카드 화면에서{" "}
                        <span className="font-medium text-slate-200">
                          학번과 학부(기계공학부 또는 기계시스템공학과)가 모두 보이는 스크린샷
                        </span>
                        을 업로드하세요.
                      </div>
                    </div>

                    {imagePreview ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                        <img
                          src={imagePreview}
                          alt="인증 사진"
                          className="w-full object-contain max-h-44"
                        />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-1.5 right-1.5 bg-slate-900/90 border border-slate-800 rounded-full p-1 hover:bg-slate-800 shadow"
                        >
                          <X className="h-3.5 w-3.5 text-slate-300" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 py-5 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 transition-colors cursor-pointer"
                      >
                        <Upload className="h-5 w-5 text-slate-500" />
                        <span className="text-xs text-slate-400">학생카드 사진 선택</span>
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
                  className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white transition-all shadow-lg shadow-primary/20"
                  disabled={isPending || !canSubmit}
                >
                  {isPending ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      {isUpperGrade ? "AI 인증 중... (10~20초 소요)" : "처리 중..."}
                    </span>
                  ) : (
                    "가입하기"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-primary hover:text-primary/90 transition-colors underline underline-offset-4 font-medium"
          >
            이미 계정이 있으신가요? 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
