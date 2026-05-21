import { useState, useRef, useEffect } from "react";
import {
  useGetFeed,
  useCreatePost,
  useCreateAnnouncement,
  getGetFeedQueryKey,
  getListPostsQueryKey,
  getListAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Heart, MessageCircle, Megaphone, PenLine, X, Send, Search, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function getStableGradient(id: string) {
  const colors = [
    "from-pink-400 to-rose-500",
    "from-purple-400 to-indigo-500",
    "from-blue-400 to-cyan-500",
    "from-teal-400 to-emerald-500",
    "from-amber-400 to-orange-500",
    "from-fuchsia-400 to-purple-600",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function AnonymousAvatar({ seedId, isCouncil }: { seedId: string; isCouncil: boolean }) {
  if (isCouncil) {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md border border-white/20 shrink-0">
        <span className="text-[10px] font-extrabold">학생회</span>
      </div>
    );
  }
  const gradient = getStableGradient(seedId);
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-md shrink-0`}>
      <span className="text-xs font-bold font-mono">익</span>
    </div>
  );
}

function AuthorBadge({ role }: { role: string }) {
  if (role === "council" || role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
        ✅ 학생회
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-slate-500 dark:text-slate-400 font-bold text-xs">
      익명 학우
    </span>
  );
}

function PostCard({ post }: { post: any }) {
  const href = post.type === "announcement" ? `/announcement/${post.id}` : `/post/${post.id}`;
  const isCouncil = post.authorRole === "council" || post.authorRole === "admin";

  return (
    <Link href={href} className="block group">
      <div className={`bg-card mx-4 my-3 p-4 rounded-2xl border border-border/40 dark:border-slate-800/60 shadow-sm hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300 relative overflow-hidden active:scale-[0.99] ${
        post.type === "announcement"
          ? "bg-gradient-to-tr from-primary/[0.02] to-indigo-500/[0.02] border-l-4 border-l-primary"
          : ""
      }`}>
        
        {/* Top Header info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AnonymousAvatar seedId={post.id} isCouncil={isCouncil} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <AuthorBadge role={post.authorRole} />
                {post.type === "announcement" && (
                  <span className="bg-primary/10 text-primary text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                    공지
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 dark:bg-slate-900/50 px-2 py-1 rounded-lg shrink-0">
            <span className="flex items-center gap-1">
              <Heart className={`h-3.5 w-3.5 ${post.likeCount > 0 ? "text-red-500 fill-red-500" : ""}`} />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{post.likeCount}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 font-bold">·</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{post.commentCount}</span>
            </span>
          </div>
        </div>

        {/* Content body */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[14.5px] lg:text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {post.content}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ComposeBox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const titleRef = useRef<HTMLInputElement>(null);

  const canAnnouncement = user?.role === "council" || user?.role === "admin";

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
  };

  const { mutate: createPost, isPending: postPending } = useCreatePost({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "게시글이 작성되었습니다" });
        reset();
      },
      onError: () => toast({ variant: "destructive", title: "작성에 실패했습니다" }),
    },
  });

  const { mutate: createAnnouncement, isPending: annPending } = useCreateAnnouncement({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "공지사항이 등록되었습니다" });
        reset();
      },
      onError: () =>
        toast({ variant: "destructive", title: "공지 작성에 실패했습니다" }),
    },
  });

  const isPending = postPending || annPending;

  function reset() {
    setTitle("");
    setContent("");
    setIsAnnouncement(false);
    setIsAnonymous(true);
    setOpen(false);
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "제목을 입력해주세요" });
      return;
    }
    if (!content.trim()) {
      toast({ variant: "destructive", title: "내용을 입력해주세요" });
      return;
    }
    if (isAnnouncement) {
      createAnnouncement({ data: { title: title.trim(), content: content.trim() } });
    } else {
      createPost({ data: { title: title.trim(), content: content.trim(), isAnonymous } });
    }
  }

  if (!open) {
    return (
      <div className="px-4 pt-4 pb-2 bg-background border-b border-border/30">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 h-12 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border border-border/40 hover:border-border/80 dark:border-slate-800 rounded-2xl text-left transition-all group cursor-pointer"
        >
          <div className="flex-1 flex items-center text-xs lg:text-sm text-slate-400">
            <PenLine className="h-4.5 w-4.5 mr-2.5 opacity-60 text-slate-400 group-hover:text-primary transition-colors" />
            <span>학우들과 나누고 싶은 이야기를 적어보세요...</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background border-b border-border shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          {isAnnouncement ? (
            <>
              <span className="p-1 rounded bg-primary/10 text-primary">
                <Megaphone className="h-3.5 w-3.5" />
              </span>
              <span>공지사항 작성</span>
            </>
          ) : (
            <>
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-500">
                <PenLine className="h-3.5 w-3.5" />
              </span>
              <span>게시글 작성</span>
            </>
          )}
        </span>
        <button
          onClick={reset}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="px-5 pt-4 pb-2.5 flex flex-col gap-3">
        <Input
          ref={titleRef}
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary bg-transparent font-bold text-sm lg:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
        />
        <Textarea
          placeholder={isAnnouncement ? "공지사항 내용을 입력하세요." : "내용을 입력하세요. 타인을 비방하는 글은 제한될 수 있습니다."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          className="resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-sm leading-relaxed text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center justify-between px-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            {canAnnouncement && (
              <button
                onClick={() => setIsAnnouncement((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  isAnnouncement
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "border-border text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5"
                }`}
              >
                <Megaphone className="h-3 w-3" />
                <span>공지로 게시</span>
              </button>
            )}

            {canAnnouncement && !isAnnouncement && (
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 border border-border/30 rounded-full">
                <button
                  type="button"
                  onClick={() => setIsAnonymous(true)}
                  className={`px-3 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                    isAnonymous
                      ? "bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 shadow-sm"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  익명
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnonymous(false)}
                  className={`px-3 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                    !isAnonymous
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  학생회
                </button>
              </div>
            )}
          </div>

          <span className="text-[11px] text-muted-foreground font-medium">
            {isAnnouncement
              ? "학생회 공식 공지로 등록됩니다"
              : isAnonymous
              ? "학부 익명 게시판에 등록됩니다"
              : "학생회 명의로 게시판에 등록됩니다"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !content.trim()}
          className="h-8.5 px-4 gap-1.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 animate-none shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{isPending ? "등록 중..." : "등록"}</span>
        </Button>
      </div>
    </div>
  );
}

export function Feed() {
  const { data: feedData, isLoading } = useGetFeed();
  const items = feedData?.items ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "announcement" | "post" | "popular">("all");

  // Filter items based on activeTab and searchQuery
  let filteredItems = items;

  if (activeTab === "announcement") {
    filteredItems = filteredItems.filter((item: any) => item.type === "announcement");
  } else if (activeTab === "post") {
    filteredItems = filteredItems.filter((item: any) => item.type === "post");
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(
      (item: any) =>
        item.title?.toLowerCase().includes(q) ||
        item.content?.toLowerCase().includes(q)
    );
  }

  if (activeTab === "popular") {
    filteredItems = [...filteredItems].sort((a: any, b: any) => b.likeCount - a.likeCount);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-background">
      <ComposeBox />

      {/* Search and Filters */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/60" />
          <Input
            placeholder="제목이나 내용으로 검색해보세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 dark:bg-slate-900/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-2xl text-xs lg:text-sm placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: "all", label: "전체", icon: MessageCircle },
            { id: "announcement", label: "공지사항", icon: Megaphone },
            { id: "post", label: "자유글", icon: PenLine },
            { id: "popular", label: "실시간 인기", icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-900/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 divide-y divide-border/20">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 px-6">
            <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-900 mb-4 text-slate-300 dark:text-slate-700">
              <MessageCircle className="h-10 w-10" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">아직 등록된 게시글이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? "검색 결과에 맞는 게시글이 없습니다." : "첫 번째 게시글을 먼저 작성해보세요!"}
            </p>
          </div>
        ) : (
          filteredItems.map((item: any) => (
            <PostCard key={`${item.type}-${item.id}`} post={item} />
          ))
        )}
      </div>
    </div>
  );
}
