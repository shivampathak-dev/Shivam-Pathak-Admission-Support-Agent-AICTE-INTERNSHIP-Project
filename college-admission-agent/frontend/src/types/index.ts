// Shared TypeScript types across the frontend

export type UserRole = "student" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  filename: string;
  page: number;
  score: number;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  created_at: string;
}

export interface IndexedDocument {
  id: number;
  filename: string;
  chunk_count: number;
  status: "pending" | "indexed" | "error";
  error_message?: string | null;
  uploaded_at: string | null;
  indexed_at: string | null;
}

export interface VectorStoreStats {
  total_chunks: number;
  documents: { filename: string; chunks: number }[];
  error?: string;
}

export interface GraniteHealth {
  status: "connected" | "mock" | "error";
  message: string;
  model: string;
}

export interface SystemStats {
  vector_store: VectorStoreStats;
  granite: GraniteHealth;
  usage: {
    total_users: number;
    total_sessions: number;
    total_messages: number;
  };
}

export interface ApiError {
  detail: string;
}
