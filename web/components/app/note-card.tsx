"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Pin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";
import { deltaToPreviewText } from "@/lib/quill";

type ViewMode = "masonry" | "grid" | "list";

interface NoteCardProps {
  note: Note;
  index?: number;
  viewMode?: ViewMode;
}

export function NoteCard({ note, index = 0, viewMode = "masonry" }: NoteCardProps) {
  const router = useRouter();

  // Handle note click - store note in sessionStorage and navigate
  const handleNoteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Store note in sessionStorage for the editor page to use
    sessionStorage.setItem(`note-${note.id}`, JSON.stringify(note));
    router.push(`/notes/${note.id}`);
  };

  // Extract plain text preview from content (assuming Delta JSON or plain text)
  const getContentPreview = (content: string | null | undefined): string => {
    if (!content) return "";
    return deltaToPreviewText(content, viewMode === "list" ? 150 : 200);
  };

  const preview = getContentPreview(note.content);

  // Calculate stagger delay (max 500ms for first 10 items)
  const staggerDelay = Math.min(index * 50, 500);

  // List view layout
  if (viewMode === "list") {
    return (
      <div onClick={handleNoteClick} className="block cursor-pointer">
        <Card
          className={cn(
            "group relative overflow-hidden cursor-pointer",
            "bg-card border border-border/40",
            "shadow-sm hover:shadow-md",
            "transition-all duration-200 ease-out",
            "hover:border-border hover:bg-muted/30",
            "animate-in fade-in-0 slide-in-from-left-4"
          )}
          style={{
            backgroundColor: note.color || undefined,
            animationDelay: `${staggerDelay}ms`,
            animationFillMode: "backwards",
          }}
        >
          <CardContent>
            <div className="flex items-start gap-4">
              {/* Pin indicator */}
              {note.isPinned && (
                <div className="pt-1 flex-shrink-0">
                  <Pin className="h-4 w-4 text-accent fill-accent" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="font-semibold text-base leading-tight mb-1.5 line-clamp-1 group-hover:text-accent transition-colors duration-200">
                  {note.title || "Untitled"}
                </h3>

                {/* Content Preview */}
                {preview && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2 leading-relaxed whitespace-pre-line">
                    {preview}
                  </p>
                )}

                {/* Tags and Date */}
                <div className="flex items-center gap-3 flex-wrap">
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {note.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
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
                        <Badge
                          variant="secondary"
                          className="text-xs px-2 py-0.5 rounded-full"
                        >
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground font-medium">
                    {format(new Date(note.updatedAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Grid and Masonry view (similar layout, different sizing)
  return (
    <div onClick={handleNoteClick} className="block cursor-pointer">
      <Card
        className={cn(
          "group relative overflow-hidden cursor-pointer",
          "bg-card border border-border/40",
          "shadow-sm hover:shadow-xl",
          "transition-all duration-300 ease-out",
          "hover:border-border hover:-translate-y-1",
          "animate-in fade-in-0 slide-in-from-bottom-4",
          viewMode === "grid" && "h-full"
        )}
        style={{
          backgroundColor: note.color || undefined,
          animationDelay: `${staggerDelay}ms`,
          animationFillMode: "backwards",
        }}
      >
        <CardContent className={cn(viewMode === "grid" && "flex flex-col h-full")}>
          {/* Pin indicator */}
          {note.isPinned && (
            <div className="absolute top-3 right-3 z-10">
              <div className="w-7 h-7 rounded-full bg-accent/10 backdrop-blur-sm flex items-center justify-center border border-accent/20">
                <Pin className="h-3.5 w-3.5 text-accent fill-accent" />
              </div>
            </div>
          )}

          {/* Title */}
          <h3
            className={cn(
              "font-bold leading-tight mb-2 pr-8 line-clamp-2 group-hover:text-accent transition-colors duration-200",
              viewMode === "grid" ? "text-base" : "text-lg"
            )}
          >
            {note.title || "Untitled"}
          </h3>

          {/* Content Preview */}
          {preview && (
            <p
              className={cn(
                "text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-line",
                viewMode === "grid" ? "line-clamp-4 flex-1" : "line-clamp-6"
              )}
            >
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
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
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
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0.5 rounded-full"
                >
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
            <span className="font-medium">
              {format(new Date(note.updatedAt), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
