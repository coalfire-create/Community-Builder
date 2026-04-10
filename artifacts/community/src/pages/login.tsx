import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin } from "@workspace/api-client-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

const formSchema = z.object({
  studentId: z.string().min(1, "학번을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: login, isPending } = useLogin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    login(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetMeQueryKey(), data.user);
          setLocation("/feed");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "로그인 실패",
            description: error.message || "학번이나 비밀번호를 확인해주세요.",
          });
        },
      }
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto bg-primary text-primary-foreground w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <span className="text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            명지대 기계시스템공학과<br/>커뮤니티
          </h1>
          <p className="text-sm text-muted-foreground">
            기계시스템공학과 학우들을 위한 공간입니다
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
                    <Input placeholder="학번" {...field} className="h-12 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary" />
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
            <Button type="submit" className="w-full h-12 text-base font-medium rounded-xl" disabled={isPending}>
              {isPending ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Link href="/register" className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
