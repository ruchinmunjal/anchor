"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { getTrashedNotes, restoreNote, permanentDeleteNote } from "@/lib/api/notes";
import { Header } from "@/components/app/header";
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
import type { Note } from "@/lib/types";

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
      note.content?.toLowerCase().includes(query)
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
            <Trash2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium text-muted-foreground">
              Trash is empty
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
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
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{note.title || "Untitled"}</h3>
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
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Delete permanently?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This note will be permanently
                  deleted and cannot be recovered.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
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
                    "Delete"
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

