"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdAt: Date | string;
  authorAvatar?: string;
}

interface CommentThreadProps {
  comments: Comment[];
  onSubmit: (body: string) => void | Promise<void>;
  entityType: string;
  entityId: string;
  className?: string;
  placeholder?: string;
}

export function CommentThread({
  comments,
  onSubmit,
  entityType,
  entityId,
  className,
  placeholder = "Add a comment...",
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(newComment);
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedComments = [...comments].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <div className={cn("space-y-4", className)}>
      {sortedComments.length > 0 && (
        <div className="space-y-4">
          {sortedComments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                {comment.authorAvatar ? (
                  <img
                    src={comment.authorAvatar}
                    alt={comment.author}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <span className="text-xs font-medium uppercase">
                    {comment.author.substring(0, 2)}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px] resize-none"
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
