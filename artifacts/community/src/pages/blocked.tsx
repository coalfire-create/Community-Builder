import { Link } from "wouter";

export function Blocked() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="mx-auto bg-primary text-primary-foreground w-16 h-16 rounded-2xl flex items-center justify-center shadow-md">
          <span className="text-2xl font-bold">M</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-xl font-semibold text-foreground">접근 제한</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            이 커뮤니티는 명지대 기계시스템공학과 학생 전용입니다.
          </p>
        </div>
        <Link href="/" className="inline-block text-sm text-primary hover:underline underline-offset-4">
          돌아가기
        </Link>
      </div>
    </div>
  );
}
