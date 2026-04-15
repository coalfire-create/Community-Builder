import { useState } from "react";
import { useLocation } from "wouter";
import { useCreatePost, useCreateAnnouncement, getListPostsQueryKey, getListAnnouncementsQueryKey, getGetFeedQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export function Write() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const canCreateAnnouncement = user?.role === "council" || user?.role === "admin";

  const { mutate: createPost, isPending: isPostPending } = useCreatePost({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        toast({ title: "게시글이 작성되었습니다" });
        setLocation(`/post/${data.id}`);
      },
      onError: () => {
        toast({ variant: "destructive", title: "작성에 실패했습니다" });
      }
    }
  });

  const { mutate: createAnnouncement, isPending: isAnnouncementPending } = useCreateAnnouncement({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        toast({ title: "공지사항이 작성되었습니다" });
        setLocation(`/announcement/${data.id}`);
      },
      onError: (error: any) => {
        toast({ variant: "destructive", title: "공지 작성에 실패했습니다", description: "학생회 회원만 공지를 작성할 수 있습니다." });
      }
    }
  });

  const isPending = isPostPending || isAnnouncementPending;

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "제목을 입력해주세요" });
      return;
    }
    if (!content.trim()) {
      toast({ variant: "destructive", title: "내용을 입력해주세요" });
      return;
    }

    if (isAnnouncement) {
      if (!canCreateAnnouncement) {
        toast({ variant: "destructive", title: "학생회 회원만 공지를 작성할 수 있습니다." });
        return;
      }
      createAnnouncement({ data: { title: title.trim(), content: content.trim() } });
    } else {
      createPost({ data: { title: title.trim(), content: content.trim() } });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/feed")} className="p-1 hover:bg-muted rounded-md transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">
            {isAnnouncement ? "공지 작성" : "글쓰기"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || !title.trim() || !content.trim()}
          className="h-8 px-4"
        >
          {isPending ? "등록 중..." : "등록"}
        </Button>
      </div>

      {canCreateAnnouncement && (
        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
          <button
            onClick={() => setIsAnnouncement(!isAnnouncement)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isAnnouncement ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              isAnnouncement ? "bg-primary border-primary" : "border-muted-foreground"
            }`}>
              {isAnnouncement && <div className="w-2 h-2 bg-white rounded-sm" />}
            </div>
            <Megaphone className="h-4 w-4" />
            공지사항으로 작성
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 py-4 gap-3">
        <Input
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base font-medium h-12 border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
        />
        <Textarea
          placeholder="내용을 입력하세요. 익명으로 게시됩니다."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 resize-none border-0 focus-visible:ring-0 px-0 bg-transparent text-sm leading-relaxed"
          rows={16}
        />
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-muted-foreground">
          {isAnnouncement ? "📢 공지사항으로 게시됩니다." : "모든 글은 익명으로 게시됩니다."}
        </p>
      </div>
    </div>
  );
}
