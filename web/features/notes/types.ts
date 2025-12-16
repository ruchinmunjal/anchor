import type { Tag } from "@/features/tags/types";

export type NoteState = "active" | "trashed" | "deleted";

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  background?: string | null;
  state: NoteState;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tagIds?: string[];
  tags?: Tag[];
}

export interface CreateNoteDto {
  title: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  background?: string | null;
  tagIds?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  background?: string | null;
  tagIds?: string[];
}

