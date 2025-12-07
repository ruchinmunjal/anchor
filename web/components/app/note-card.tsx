"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  // Extract plain text preview from content (assuming Delta JSON or plain text)
  const getContentPreview = (content: string | null | undefined): string => {
    if (!content) return "";

    try {
      // Try to parse as Quill Delta
      const parsed = JSON.parse(content);
      if (parsed.ops) {
        return parsed.ops
          .map((op: { insert?: string }) =>
            typeof op.insert === "string" ? op.insert : ""
          )
          .join("")
          .slice(0, 200);
      }
    } catch {
      // Plain text or other format
      return content.slice(0, 200);
    }
    return "";
  };

  const preview = getContentPreview(note.content);

  return (
    <Link href={`/notes/${note.id}`}>
      <Card
        className={cn(
          "group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
          "hover:scale-[1.02] hover:-translate-y-0.5"
        )}
        style={{
          backgroundColor: note.color || undefined,
        }}
      >
        <CardContent className="p-5">
          {/* Pin indicator */}
          {note.isPinned && (
            <div className="absolute top-3 right-3">
              <Pin className="h-4 w-4 text-accent fill-accent" />
            </div>
          )}

          {/* Title */}
          <h3 className="font-bold text-lg leading-tight mb-2 pr-6 line-clamp-2">
            {note.title || "Untitled"}
          </h3>

          {/* Content Preview */}
          {preview && (
            <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
              {preview}
            </p>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {note.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: tag.color
                      ? `${tag.color}20`
                      : undefined,
                    color: tag.color || undefined,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full">
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {format(new Date(note.updatedAt), "MMM d")}
            </span>
            {/* Sync status indicator would go here for offline support */}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

