"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Masonry from "react-masonry-css";
import {
  Sparkles,
  Search,
  Loader2,
  X,
  Plus,
  Grid3x3,
  LayoutGrid,
  List,
  Pin
} from "lucide-react";
import { getNotes, deltaToFullPlainText } from "@/features/notes";
import { getTags } from "@/features/tags";
import { Header } from "@/components/layout";
import { NoteCard } from "@/features/notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Link from "next/link";

const masonryBreakpoints = {
  default: 4,
  1536: 4,
  1280: 3,
  1024: 3,
  768: 2,
  640: 1,
};

type ViewMode = "masonry" | "grid" | "list";

export default function NotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagIdParam = searchParams.get("tagId");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "masonry";
    const saved = localStorage.getItem("notes-view-mode") as ViewMode | null;
    if (saved && ["masonry", "grid", "list"].includes(saved)) {
      return saved;
    }
    return "masonry";
  });

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem("notes-view-mode", viewMode);
  }, [viewMode]);

  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: ["notes", tagIdParam],
    queryFn: () => getNotes({ tagId: tagIdParam || undefined }),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  // Join tags with notes based on tagIds
  const notesWithTags = useMemo(() => {
    return notes.map((note) => ({
      ...note,
      tags: note.tagIds
        ? note.tagIds
          .map((tagId) => tags.find((tag) => tag.id === tagId))
          .filter((tag): tag is NonNullable<typeof tag> => tag !== undefined)
        : [],
    }));
  }, [notes, tags]);

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notesWithTags;

    const query = searchQuery.toLowerCase();
    return notesWithTags.filter((note) => {
      const titleMatch = note.title.toLowerCase().includes(query);
      const contentMatch = deltaToFullPlainText(note.content).toLowerCase().includes(query);
      return titleMatch || contentMatch;
    });
  }, [notesWithTags, searchQuery]);

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const unpinnedNotes = filteredNotes.filter((note) => !note.isPinned);

  // Get selected tag
  const selectedTag = tagIdParam
    ? tags.find((tag) => tag.id === tagIdParam)
    : null;


  const renderNotesGrid = (notesToRender: typeof filteredNotes, startIndex = 0) => {
    if (viewMode === "list") {
      return (
        <div className="space-y-2">
          {notesToRender.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              index={startIndex + index}
              viewMode="list"
            />
          ))}
        </div>
      );
    }

    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notesToRender.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              index={startIndex + index}
              viewMode="grid"
            />
          ))}
        </div>
      );
    }

    // Masonry view
    return (
      <Masonry
        breakpointCols={masonryBreakpoints}
        className="masonry-grid"
        columnClassName="masonry-grid-column"
      >
        {notesToRender.map((note, index) => (
          <NoteCard
            key={note.id}
            note={note}
            index={startIndex + index}
            viewMode="masonry"
          />
        ))}
      </Masonry>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <div className="flex-1">
        <div className="p-4 lg:p-8">
          {/* Controls Bar */}
          {(filteredNotes.length > 0 || searchQuery || selectedTag) && (
            <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Tag filter indicator */}
              {selectedTag && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 border border-border/40">
                  <span className="text-sm text-muted-foreground">Filtering by</span>
                  <Badge
                    variant="secondary"
                    className="gap-1.5"
                    style={{
                      backgroundColor: selectedTag.color
                        ? `${selectedTag.color}20`
                        : undefined,
                      color: selectedTag.color || undefined,
                    }}
                  >
                    {selectedTag.name}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    asChild
                  >
                    <Link href="/notes">
                      <X className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}

              {/* View Mode Toggle */}
              {filteredNotes.length > 0 && (
                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    View:
                  </span>
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(value) => {
                      if (value) setViewMode(value as ViewMode);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ToggleGroupItem value="masonry" aria-label="Masonry view">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="grid" aria-label="Grid view">
                      <Grid3x3 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="list" aria-label="List view">
                      <List className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          {notesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
              {searchQuery ? (
                <>
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
                      <Search className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-accent/20 border-2 border-background flex items-center justify-center">
                      <X className="h-3 w-3 text-accent" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">
                    No matching notes found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Try adjusting your search terms or{" "}
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-accent hover:underline"
                    >
                      clear the search
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-accent" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent/30 border-2 border-background flex items-center justify-center animate-pulse">
                      <Plus className="h-4 w-4 text-accent" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold text-foreground mb-2">
                    Start capturing your ideas
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Create your first note to begin organizing your thoughts
                  </p>
                  <Button
                    onClick={() => router.push("/notes/new")}
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Your First Note
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-10">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/40">
                      <Pin className="h-3 w-3" />
                      <span>Pinned</span>
                      <span className="text-muted-foreground/60">
                        ({pinnedNotes.length})
                      </span>
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                  {renderNotesGrid(pinnedNotes, 0)}
                </section>
              )}

              {/* Other Notes */}
              {unpinnedNotes.length > 0 && (
                <section className="space-y-4">
                  {pinnedNotes.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/40">
                        <span>All Notes</span>
                        <span className="text-muted-foreground/60">
                          ({unpinnedNotes.length})
                        </span>
                      </h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                  )}
                  {renderNotesGrid(unpinnedNotes, pinnedNotes.length)}
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
