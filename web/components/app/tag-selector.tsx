"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X, Loader2 } from "lucide-react";
import { getTags } from "@/lib/api/tags";
import { createTag } from "@/lib/api/tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      createTagMutation.mutate({ name: newTagName.trim() });
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
          className="gap-1.5 pr-1"
          style={{
            backgroundColor: tag.color ? `${tag.color}20` : undefined,
            color: tag.color || undefined,
          }}
        >
          {tag.name}
          {!readOnly && (
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="ml-1 rounded-full hover:bg-foreground/10 p-0.5"
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
              className="h-7 gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
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
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm",
                            "hover:bg-muted transition-colors text-left"
                          )}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: tag.color || "var(--accent)",
                            }}
                          />
                          {tag.name}
                        </button>
                      ))}
                  </div>
                </ScrollArea>

                <div className="border-t mt-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New tag..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || createTagMutation.isPending}
                    >
                      {createTagMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

