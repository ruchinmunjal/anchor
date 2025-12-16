"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import {
  getTrashedNotes,
  restoreNote,
  permanentDeleteNote,
  deltaToFullPlainText,
} from "@/features/notes";
import type { Note } from "@/features/notes";
import { Header } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export default function TrashPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", "trash"],
    queryFn: getTrashedNotes,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note restored");
    },
    onError: () => {
      toast.error("Failed to restore note");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: permanentDeleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", "trash"] });
      toast.success("Note permanently deleted");
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      deltaToFullPlainText(note.content).toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="flex-1 p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold">Trash</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notes in trash will be permanently deleted after 30 days
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Trash2 className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-medium text-foreground">
              Trash is empty
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Deleted notes will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <TrashNoteCard
                key={note.id}
                note={note}
                onRestore={() => restoreMutation.mutate(note.id)}
                onDelete={() => deleteMutation.mutate(note.id)}
                isRestoring={restoreMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TrashNoteCardProps {
  note: Note;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring: boolean;
  isDeleting: boolean;
}

function TrashNoteCard({
  note,
  onRestore,
  onDelete,
  isRestoring,
  isDeleting,
}: TrashNoteCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <Card className="border border-border/40 shadow-sm hover:shadow-md transition-all duration-200 hover:border-border">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate text-foreground/90">
            {note.title || "Untitled"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Deleted {format(new Date(note.updatedAt), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            disabled={isRestoring}
            className="gap-2 hover:bg-accent/10 hover:text-accent"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Restore</span>
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  Delete permanently?
                </DialogTitle>
                <DialogDescription className="pt-2">
                  This action cannot be undone. This note will be permanently
                  deleted and cannot be recovered.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete();
                    setDeleteDialogOpen(false);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete Forever"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

