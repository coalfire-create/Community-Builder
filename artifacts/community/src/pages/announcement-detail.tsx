import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetAnnouncement, useDeleteAnnouncement, useToggleAnnouncementLike, useCreateAnnouncementComment, useDeleteAnnouncementComment, getGetAnnouncementQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, ArrowLeft, Trash2, Send, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function AuthorBadge({ role }: { role: string }) {
  if (role === "council" || role === "admin") {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-foreground/70 text-sm">익명</span>
        <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-xs font-medium px-1.5 py-0.5 rounded-full border border-primary/20">
          ✅ 학생회
        </span>
      </span>
    );
  }
  return <span className="text-foreground/70 text-sm">익명</span>;
}

export function AnnouncementDetail() {
  const [, params] = useRoute("/announcement/:id");
  const [, setLocation] = useLocation();
  const postId = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: post, isLoading } = useGetAnnouncement(postId, {
    query: { enabled: !!postId, queryKey: getGetAnnouncementQueryKey(postId) }
  });

  const { mutate: deletePost, isPending: isDeleting } = useDeleteAnnouncement({
    mutation: {
      onSuccess: () => {
        toast({ title: "공지사항이 삭제되었습니다" });
        setLocation("/feed");
      }
    }
  });

  const { mutate: toggleLike } = useToggleAnnouncementLike({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAnnouncementQueryKey(postId) });
      }
    }
  });

  const { mutate: createComment, isPending: isCommenting } = useCreateAnnouncementComment({
    mutation: {
      onSuccess: () => {
        setComment("");
        queryClient.invalidateQueries({ queryKey: getGetAnnouncementQueryKey(postId) });
      }
    }
  });

  const { mutate: deleteComment } = useDeleteAnnouncementComment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAnnouncementQueryKey(postId) });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>공지사항을 찾을 수 없습니다</p>
      </div>
    );
  }

  const canDelete = post.isOwnPost || user?.role === "admin";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <button onClick={() => setLocation("/feed")} className="p-1 hover:bg-muted rounded-md transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <Megaphone className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">공지사항</span>
        </div>
        {canDelete && (
          <div className="ml-auto">
            <button
              onClick={() => deletePost({ postId })}
              disabled={isDeleting}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-5 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground mb-3 leading-snug">{post.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <AuthorBadge role={post.authorRole} />
            <span>·</span>
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => toggleLike({ postId })}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                post.isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-400"
              }`}
            >
              <Heart className={`h-4 w-4 ${post.isLiked ? "fill-current" : ""}`} />
              <span>{post.likeCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {post.commentCount}
            </span>
          </div>
        </div>

        <div className="divide-y divide-border">
          {post.comments?.map((comment: any) => (
            <div key={comment.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AuthorBadge role={comment.authorRole} />
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ko })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
                {comment.isOwnComment && (
                  <button
                    onClick={() => deleteComment({ postId, commentId: comment.id })}
                    className="shrink-0 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border p-3 flex gap-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="resize-none text-sm min-h-[40px] h-10 py-2"
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
          className="shrink-0 h-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
