import { useState } from "react";
import { useGetFeed, useListAnnouncements } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Heart, MessageCircle, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

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

function PostCard({ post, isAnnouncement }: { post: any; isAnnouncement?: boolean }) {
  const href = isAnnouncement || post.type === "announcement"
    ? `/announcement/${post.id}`
    : `/post/${post.id}`;

  return (
    <Link href={href} className="block">
      <div className="bg-background border-b border-border hover:bg-muted/30 transition-colors px-4 py-3.5 cursor-pointer active:bg-muted/50">
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
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })}</span>
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

export function Feed() {
  const [tab, setTab] = useState<"all" | "announcements">("all");
  const [, setLocation] = useLocation();

  const { data: feedData, isLoading: feedLoading } = useGetFeed();
  const { data: announcementsData, isLoading: annLoading } = useListAnnouncements();

  const items = feedData?.items ?? [];
  const announcements = announcementsData?.posts ?? [];

  const isLoading = tab === "all" ? feedLoading : annLoading;
  const displayItems = tab === "all" ? items : announcements;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="sticky top-14 z-40 bg-background border-b border-border">
        <div className="flex">
          <button
            onClick={() => setTab("all")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "all"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            전체글
          </button>
          <button
            onClick={() => setTab("announcements")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "announcements"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            공지사항
          </button>
          <button
            onClick={() => setLocation("/write")}
            className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            글쓰기
          </button>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">아직 게시글이 없습니다</p>
            <p className="text-xs mt-1">첫 번째 게시글을 작성해보세요!</p>
          </div>
        ) : (
          displayItems.map((item: any) => (
            <PostCard key={`${item.type}-${item.id}`} post={item} />
          ))
        )}
      </div>
    </div>
  );
}
