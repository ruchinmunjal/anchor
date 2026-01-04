"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { getTags, createTag, generateRandomTagColor } from "@/features/tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  readOnly?: boolean;
}

export function TagSelector({
  selectedTagIds,
  onTagsChange,
  readOnly = false,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onTagsChange([...selectedTagIds, newTag.id]);
      setNewTagName("");
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Failed to create tag");
    },
  });

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      setErrorMessage(null);
      createTagMutation.mutate({
        name: newTagName.trim(),
        color: generateRandomTagColor(),
      });
    }
  };

  const handleTagNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTagName(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  if (readOnly && selectedTags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selectedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="secondary"
          className="gap-1.5 px-3 py-1.5 text-xs font-medium border border-border/30 hover:border-border/50 transition-all duration-150"
          style={{
            backgroundColor: tag.color ? `${tag.color}12` : undefined,
            color: tag.color || undefined,
            borderColor: tag.color ? `${tag.color}30` : undefined,
          }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/20"
            style={{
              backgroundColor: tag.color || "var(--accent)",
            }}
          />
          {tag.name}
          {!readOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTag(tag.id);
              }}
              className="ml-0.5 rounded-full hover:bg-foreground/15 p-0.5 transition-all duration-150 hover:scale-110"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {!readOnly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/5 border border-transparent hover:border-accent/20 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 shadow-lg border-border/40" align="start"
            onOpenAutoFocus={(e) => {
              // Prevent default auto-focus on first element
              e.preventDefault();
            }}>
            <div className="flex flex-col">
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
                <h3 className="text-sm font-medium text-foreground">Select tags</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Choose existing tags or create new ones</p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span className="text-sm text-muted-foreground">Loading tags...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tag List */}
                  <div className="max-h-64 overflow-y-auto">
                    {tags.filter((tag) => !selectedTagIds.includes(tag.id)).length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
                          <Check className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">All tags added</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Create a new tag below</p>
                      </div>
                    ) : (
                      <div className="p-2">
                        {tags
                          .filter((tag) => !selectedTagIds.includes(tag.id))
                          .map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                toggleTag(tag.id);
                                setOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm",
                                "hover:bg-accent/5 transition-all duration-150 text-left group",
                                "focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-accent/5",
                                "active:scale-[0.98]"
                              )}
                            >
                              <div
                                className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/20 shadow-sm"
                                style={{
                                  backgroundColor: tag.color || "var(--accent)",
                                }}
                              />
                              <span className="flex-1 text-foreground truncate">{tag.name}</span>
                              <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Create New Tag */}
                  <div className="border-t border-border/40 p-4 bg-background/50">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Input
                            placeholder="Create new tag..."
                            value={newTagName}
                            onChange={handleTagNameChange}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateTag();
                              }
                            }}
                            className={cn(
                              "h-10 text-sm border-border/40 focus:border-accent/40 focus:ring-accent/20",
                              errorMessage && "border-destructive focus:border-destructive focus:ring-destructive/20"
                            )}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant={errorMessage ? "destructive" : "default"}
                          className="h-10 w-10 p-0 shrink-0"
                          onClick={handleCreateTag}
                          disabled={!newTagName.trim() || createTagMutation.isPending}
                        >
                          {createTagMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : errorMessage ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errorMessage && (
                        <p className="text-xs text-destructive px-1">
                          {errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
