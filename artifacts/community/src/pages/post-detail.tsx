import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetPost, useDeletePost, useTogglePostLike, useCreatePostComment, useDeletePostComment, getGetPostQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, ArrowLeft, Trash2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

export function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const [, setLocation] = useLocation();
  const postId = params?.id as unknown as number;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: post, isLoading } = useGetPost(postId, {
    query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) }
  });

  const { mutate: deletePost, isPending: isDeleting } = useDeletePost({
    mutation: {
      onSuccess: () => {
        toast({ title: "게시글이 삭제되었습니다" });
        setLocation("/feed");
      }
    }
  });

  const { mutate: toggleLike } = useTogglePostLike({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      }
    }
  });

  const { mutate: createComment, isPending: isCommenting } = useCreatePostComment({
    mutation: {
      onSuccess: () => {
        setComment("");
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      }
    }
  });

  const { mutate: deleteComment } = useDeletePostComment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-background">
        <p className="text-sm font-semibold">게시글을 찾을 수 없습니다</p>
      </div>
    );
  }

  const isCouncil = post.authorRole === "council" || post.authorRole === "admin";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-background">
      
      {/* Header Panel */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-background/50 sticky top-16 z-10 backdrop-blur-sm">
        <button
          onClick={() => setLocation("/feed")}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">상세보기</span>
        
        {post.isOwnPost && (
          <div className="ml-auto">
            <button
              onClick={() => deletePost({ postId })}
              disabled={isDeleting}
              className="p-2 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              title="게시글 삭제"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto pb-20">
        {/* Post Contents Card */}
        <div className="px-5 py-6 border-b border-border/50 bg-card">
          <div className="flex items-center gap-2.5 mb-4">
            <AnonymousAvatar seedId={post.id} isCouncil={isCouncil} />
            <div className="flex flex-col">
              <AuthorBadge role={post.authorRole} />
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}
              </span>
            </div>
          </div>

          <h1 className="text-base lg:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3.5 leading-snug">
            {post.title}
          </h1>

          <p className="text-[13.5px] lg:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          <div className="flex items-center gap-4 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={() => toggleLike({ postId })}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                post.isLiked
                  ? "bg-red-50 dark:bg-red-950/20 text-red-500 border-red-200/50 dark:border-red-900/30 shadow-sm"
                  : "border-border text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-200/50 hover:bg-red-50/50 dark:hover:bg-red-950/10"
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`} />
              <span>{post.likeCount}</span>
            </button>
            
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-border text-slate-500 dark:text-slate-400 bg-muted/20">
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{post.commentCount}</span>
            </div>
          </div>
        </div>

        {/* Comment Thread List */}
        <div className="divide-y divide-border/20 bg-slate-50/20 dark:bg-slate-900/10">
          <div className="px-5 py-3 text-xs font-bold text-slate-400 border-b border-border/10">
            댓글 {post.comments?.length ?? 0}개
          </div>
          {post.comments?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <MessageCircle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">첫 댓글을 달아 분위기를 띄워보세요!</p>
            </div>
          ) : (
            post.comments?.map((comment: any) => {
              const isCommentCouncil = comment.authorRole === "council" || comment.authorRole === "admin";
              return (
                <div key={comment.id} className="px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 flex items-start gap-2.5">
                      <AnonymousAvatar seedId={comment.id} isCouncil={isCommentCouncil} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <AuthorBadge role={comment.authorRole} />
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                    
                    {comment.isOwnComment && (
                      <button
                        onClick={() => deleteComment({ postId, commentId: comment.id })}
                        className="shrink-0 p-1.5 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                        title="댓글 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Comment Form */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/80 p-3 flex gap-2 z-10">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="resize-none text-xs lg:text-sm min-h-[40px] h-10 py-2.5 px-4 bg-slate-50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 rounded-2xl focus-visible:ring-primary focus-visible:border-primary placeholder:text-slate-400"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (comment.trim()) {
                createComment({ postId, data: { content: comment.trim() } });
              }
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => {
            if (comment.trim()) {
              createComment({ postId, data: { content: comment.trim() } });
            }
          }}
          disabled={isCommenting || !comment.trim()}
          className="shrink-0 h-10 w-10 p-0 rounded-2xl bg-primary text-white hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
