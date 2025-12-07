"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  Pin,
  PinOff,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { getNote, createNote, updateNote, deleteNote } from "@/lib/api/notes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagSelector } from "@/components/app/tag-selector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CreateNoteDto, UpdateNoteDto } from "@/lib/types";

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const noteId = params.id as string;
  const isNew = noteId === "new";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string; isPinned: boolean; tagIds: string[] } | null>(null);

  // Fetch existing note
  const { data: note, isLoading } = useQuery({
    queryKey: ["notes", noteId],
    queryFn: () => getNote(noteId),
    enabled: !isNew,
  });

  // Initialize form with note data
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content || "");
      setIsPinned(note.isPinned);
      setSelectedTagIds(note.tags?.map((t) => t.id) || []);
      lastSavedRef.current = {
        title: note.title,
        content: note.content || "",
        isPinned: note.isPinned,
        tagIds: note.tags?.map((t) => t.id) || [],
      };
    }
  }, [note]);

  // Create note mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateNoteDto) => createNote(data),
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note created");
      router.replace(`/notes/${newNote.id}`);
    },
    onError: () => {
      toast.error("Failed to create note");
    },
  });

  // Update note mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateNoteDto) => updateNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["notes", noteId] });
      setHasUnsavedChanges(false);
      lastSavedRef.current = { title, content, isPinned, tagIds: selectedTagIds };
    },
    onError: () => {
      toast.error("Failed to save note");
    },
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note moved to trash");
      router.push("/");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  // Check for unsaved changes
  const checkUnsavedChanges = useCallback(() => {
    if (!lastSavedRef.current && isNew) {
      return title.trim() !== "" || content.trim() !== "";
    }
    if (!lastSavedRef.current) return false;

    return (
      title !== lastSavedRef.current.title ||
      content !== lastSavedRef.current.content ||
      isPinned !== lastSavedRef.current.isPinned ||
      JSON.stringify(selectedTagIds.sort()) !== JSON.stringify(lastSavedRef.current.tagIds.sort())
    );
  }, [title, content, isPinned, selectedTagIds, isNew]);

  useEffect(() => {
    setHasUnsavedChanges(checkUnsavedChanges());
  }, [checkUnsavedChanges]);

  // Auto-save with debounce
  const save = useCallback(() => {
    if (!title.trim() && !content.trim()) return;

    if (isNew) {
      createMutation.mutate({
        title: title.trim() || "Untitled",
        content: content || undefined,
        isPinned,
        tagIds: selectedTagIds,
      });
    } else {
      updateMutation.mutate({
        title: title.trim() || "Untitled",
        content: content || undefined,
        isPinned,
        tagIds: selectedTagIds,
      });
    }
  }, [title, content, isPinned, selectedTagIds, isNew, createMutation, updateMutation]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, save]);

  // Save on unmount if there are changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      save();
    }
    router.push("/");
  };

  const togglePin = () => {
    setIsPinned((prev) => !prev);
  };

  if (isLoading && !isNew) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="-ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1">
          {/* Save indicator */}
          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground mr-2">Unsaved</span>
          )}
          {(updateMutation.isPending || createMutation.isPending) && (
            <span className="text-xs text-muted-foreground mr-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={togglePin}
            className={cn(isPinned && "text-accent")}
          >
            {isPinned ? (
              <Pin className="h-5 w-5 fill-current" />
            ) : (
              <PinOff className="h-5 w-5" />
            )}
          </Button>

          {!isNew && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="border-0 bg-transparent text-3xl font-bold placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0 h-auto py-2"
        />

        {/* Tags */}
        <div className="py-3">
          <TagSelector
            selectedTagIds={selectedTagIds}
            onTagsChange={setSelectedTagIds}
          />
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing..."
          className={cn(
            "w-full min-h-[calc(100vh-280px)] resize-none border-0 bg-transparent",
            "text-base leading-relaxed placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-0"
          )}
        />
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete note?
            </DialogTitle>
            <DialogDescription>
              This note will be moved to trash. You can restore it within 30
              days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteMutation.mutate();
                setDeleteDialogOpen(false);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

