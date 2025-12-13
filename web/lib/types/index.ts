export type NoteState = "active" | "trashed" | "deleted";

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  color?: string | null;
  state: NoteState;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tagIds?: string[];
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export interface CreateNoteDto {
  title: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
  tagIds?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
  tagIds?: string[];
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

