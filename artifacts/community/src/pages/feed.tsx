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
import { Heart, MessageCircle, Megaphone, PenLine, X, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function AuthorBadge({ role }: { role: string }) {
  if (role === "council" || role === "admin") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-foreground/70">익명</span>
        <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-xs font-medium px-1.5 py-0.5 rounded-full border border-primary/20">
          ✅ 학생회
        </span>
      </span>
    );
  }
  return <span className="text-foreground/70">익명</span>;
}

function PostCard({ post }: { post: any }) {
  const href =
    post.type === "announcement" ? `/announcement/${post.id}` : `/post/${post.id}`;

  return (
    <Link href={href} className="block">
      <div
        className={`bg-background border-b border-border hover:bg-muted/30 transition-colors px-4 py-3.5 cursor-pointer active:bg-muted/50 ${
          post.type === "announcement" ? "border-l-4 border-l-primary" : ""
        }`}
      >
        {post.type === "announcement" && (
          <div className="flex items-center gap-1 mb-1.5">
            <Megaphone className="h-3 w-3 text-primary" />
            <span className="text-xs font-semibold text-primary">공지</span>
          </div>
        )}
        <h3 className="font-medium text-foreground text-sm leading-snug mb-2 line-clamp-2">
          {post.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AuthorBadge role={post.authorRole} />
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(post.createdAt), {
                addSuffix: true,
                locale: ko,
              })}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {post.commentCount}
            </span>
          </div>
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
      createPost({ data: { title: title.trim(), content: content.trim() } });
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-background border-b border-border hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex-1 h-9 rounded-full bg-muted/60 flex items-center px-4 text-sm text-muted-foreground">
          <PenLine className="h-3.5 w-3.5 mr-2 opacity-60" />
          게시글을 작성해보세요...
        </div>
      </button>
    );
  }

  return (
    <div className="bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <span className="text-sm font-semibold text-foreground">
          {isAnnouncement ? "📢 공지 작성" : "글쓰기"}
        </span>
        <button
          onClick={reset}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 pt-3 pb-2 flex flex-col gap-2">
        <Input
          ref={titleRef}
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent font-medium text-sm"
        />
        <Textarea
          placeholder="내용을 입력하세요. 익명으로 게시됩니다."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-sm leading-relaxed"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-2">
          {canAnnouncement && (
            <button
              onClick={() => setIsAnnouncement((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                isAnnouncement
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <Megaphone className="h-3 w-3" />
              공지로 등록
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {isAnnouncement ? "학생회 공지로 게시됩니다" : "익명으로 게시됩니다"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !content.trim()}
          className="h-8 px-4 gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {isPending ? "등록 중..." : "등록"}
        </Button>
      </div>
    </div>
  );
}

export function Feed() {
  const { data: feedData, isLoading } = useGetFeed();
  const items = feedData?.items ?? [];

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <ComposeBox />

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">아직 게시글이 없습니다</p>
            <p className="text-xs mt-1">첫 번째 게시글을 작성해보세요!</p>
          </div>
        ) : (
          items.map((item: any) => (
            <PostCard key={`${item.type}-${item.id}`} post={item} />
          ))
        )}
      </div>
    </div>
  );
}
