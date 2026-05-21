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
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X, Megaphone, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const formSchema = z.object({
  studentId: z.string().min(1, "학번 또는 전화번호를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

const CAMPAIGN_IMAGES = [
  {
    src: "/campaign-1.jpg",
    title: "기호 1번 [기본] - 세로 포스터",
    desc: "회장 박민우 & 부회장 이현교 후보의 상세 이력과 핵심 공약",
  },
  {
    src: "/campaign-2.jpg",
    title: "기호 1번 [기본] - 가로 포스터",
    desc: "명지대 기계공학과 5대 핵심 공약 요약본",
  },
];

export function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: login, isPending } = useLogin();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Auto-play slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAMPAIGN_IMAGES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAMPAIGN_IMAGES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAMPAIGN_IMAGES.length) % CAMPAIGN_IMAGES.length);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 text-slate-100 overflow-x-hidden">
      
      {/* Left: Campaign Poster Slider & Pledges */}
      <div className="w-full lg:w-[60%] flex flex-col justify-center items-center p-6 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/40 backdrop-blur-sm relative min-h-[50vh] lg:min-h-screen">
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
          {/* Header Banner */}
          <div className="flex items-center gap-2 mb-4 bg-primary/10 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-xs font-semibold shadow-inner shadow-primary/5 animate-pulse">
            <Megaphone className="h-3.5 w-3.5" />
            <span>제44대 학생회장단 선거 기호 1번 [기본]</span>
          </div>

          <h2 className="text-xl lg:text-3xl font-extrabold text-center mb-1 bg-gradient-to-r from-blue-400 via-indigo-200 to-blue-400 bg-clip-text text-transparent">
            기계의 뿌리가 되리!!
          </h2>
          <p className="text-xs lg:text-sm text-slate-400 text-center mb-6">
            포스터를 클릭하시면 전체 크기로 상세 공약을 보실 수 있습니다.
          </p>

          {/* Slider Container */}
          <div className="relative w-full max-w-md aspect-[3/4] lg:aspect-[4/5] xl:aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full h-full relative cursor-zoom-in"
                onClick={() => setZoomImage(CAMPAIGN_IMAGES[currentSlide].src)}
              >
                <img
                  src={CAMPAIGN_IMAGES[currentSlide].src}
                  alt={CAMPAIGN_IMAGES[currentSlide].title}
                  className="w-full h-full object-contain bg-slate-950"
                />
                
                {/* Hover overlay with zoom icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                  <div className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-white">
                    <ZoomIn className="h-6 w-6" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-all opacity-0 group-hover:opacity-100 shadow-md"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-all opacity-0 group-hover:opacity-100 shadow-md"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Slider Indicators */}
          <div className="flex gap-2 mt-4">
            {CAMPAIGN_IMAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentSlide === idx ? "w-6 bg-primary" : "w-2.5 bg-slate-800 hover:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Campaign Details Info Card */}
          <div className="w-full max-w-md mt-6 p-4 rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex gap-3 items-start">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-200">{CAMPAIGN_IMAGES[currentSlide].title}</div>
              <div>{CAMPAIGN_IMAGES[currentSlide].desc}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Login Form Column */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center items-center p-6 lg:p-12 relative min-h-[50vh] lg:min-h-screen">
        
        {/* Glow Effects */}
        <div className="absolute top-[20%] right-[10%] w-72 h-72 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[10%] w-72 h-72 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-sm space-y-8 relative z-10">
          {/* Brand/Logo Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex items-center gap-3">
              <img
                src="/mju-logo.png"
                alt="명지대학교"
                className="h-10 object-contain brightness-0 invert"
              />
              <div className="w-px h-6 bg-slate-800" />
              <img
                src="/logo.jpg"
                alt="기계시스템공학과 로고"
                className="h-9 w-9 rounded-lg object-cover shadow border border-slate-800"
              />
            </div>
            
            <div className="space-y-1.5 pt-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                기계시스템공학과 커뮤니티
              </h1>
              <p className="text-sm text-slate-400">
                명지대학교 기계시스템공학부 학우들의 익명 소통 공간
              </p>
            </div>
          </div>

          {/* Login Card Form */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md shadow-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="학번 또는 전화번호 (광역)"
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
                          {...field}
                          className="h-12 bg-slate-900/60 border-slate-800 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-slate-100 placeholder:text-slate-500 rounded-xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/95 text-white transition-all shadow-lg shadow-primary/20"
                  disabled={isPending}
                >
                  {isPending ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <Link
                href="/register"
                className="text-sm text-primary hover:text-primary/90 transition-colors underline underline-offset-4 font-medium"
              >
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-8 cursor-zoom-out"
            onClick={() => setZoomImage(null)}
          >
            {/* Close Button */}
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-md"
            >
              <X className="h-6 w-6" />
            </button>
            
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
            >
              <img
                src={zoomImage}
                alt="포스터 확대본"
                className="max-w-full max-h-[90vh] object-contain rounded-lg border border-slate-800 shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

