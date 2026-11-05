// Typed API client wrapping all backend endpoints
// When NEXT_PUBLIC_API_URL is empty/unset, use relative "/api" so that
// Next.js rewrites proxy the request to the backend (works in dev and Docker).
// When NEXT_PUBLIC_API_URL is set (IBM Cloud / production), call the backend directly.
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "/api";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("auth_token", token);
      else localStorage.removeItem("auth_token");
    }
  }

  loadToken() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let detail = `Request failed: ${res.status}`;
      try {
        const err = await res.json();
        detail = err.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(name: string, email: string, password: string) {
    return this.request<{ access_token: string; user: import("@/types").User }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ name, email, password }) }
    );
  }

  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: import("@/types").User }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    );
  }

  async me() {
    return this.request<import("@/types").User>("/auth/me");
  }

  // ── Chat sessions ──────────────────────────────────────────────────────────

  async getSessions() {
    return this.request<import("@/types").ChatSession[]>("/chat/sessions");
  }

  async createSession(title = "New Conversation") {
    return this.request<import("@/types").ChatSession>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
  }

  async deleteSession(sessionId: number) {
    return this.request<void>(`/chat/sessions/${sessionId}`, { method: "DELETE" });
  }

  async getMessages(sessionId: number) {
    return this.request<import("@/types").ChatMessage[]>(
      `/chat/sessions/${sessionId}/messages`
    );
  }

  async sendMessage(message: string, sessionId?: number) {
    return this.request<{
      session_id: number;
      answer: string;
      sources: import("@/types").Source[];
      message_id: number;
    }>("/chat/query", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  }

  // ── Streaming query ────────────────────────────────────────────────────────

  getStreamUrl(): string {
    return `${API_BASE}/chat/query/stream`;
  }

  getToken(): string | null {
    return this.token;
  }

  getAuthHeaders(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async getDocuments() {
    return this.request<import("@/types").IndexedDocument[]>("/admin/documents");
  }

  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}/admin/documents/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  }

  async deleteDocument(docId: number) {
    return this.request<void>(`/admin/documents/${docId}`, { method: "DELETE" });
  }

  async reindexDocument(docId: number) {
    return this.request<{ message: string }>(`/admin/documents/${docId}/reindex`, {
      method: "POST",
    });
  }

  async getStats() {
    return this.request<import("@/types").SystemStats>("/admin/stats");
  }
}

export const apiClient = new ApiClient();
apiClient.loadToken();
