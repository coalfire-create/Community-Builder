import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@workspace/api-client-react";
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

const formSchema = z.object({
  studentId: z.string().min(8, "올바른 학번을 입력해주세요"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
  name: z.string().min(2, "이름을 입력해주세요"),
  department: z.string().refine(val => val === "기계시스템공학과", {
    message: "기계시스템공학과 소속만 가입할 수 있습니다",
  }),
});

export function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { mutate: register, isPending } = useRegister();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      password: "",
      name: "",
      department: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    register(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "회원가입 성공", description: "로그인해주세요." });
          setLocation("/");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "회원가입 실패",
            description: error.message || "입력한 정보를 확인해주세요.",
          });
        },
      }
    );
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
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="학번 (예: 60190000)" {...field} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
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
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="학과 (기계시스템공학과)" {...field} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-base font-medium rounded-xl" disabled={isPending}>
              {isPending ? "가입 중..." : "회원가입"}
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
