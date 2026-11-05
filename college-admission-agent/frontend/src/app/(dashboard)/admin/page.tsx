"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Trash2,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Database,
  Users,
  MessageSquare,
  Cpu,
  CloudOff,
  Loader2,
  BarChart3,
  FolderOpen,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/useToast";
import { cn, formatDate } from "@/lib/utils";
import type { IndexedDocument, SystemStats } from "@/types";
import { useRouter } from "next/navigation";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IndexedDocument["status"] }) {
  const map = {
    indexed: { icon: CheckCircle, label: "Indexed", cls: "text-emerald-400 bg-emerald-900/30 border-emerald-700/40" },
    pending: { icon: Clock, label: "Processing", cls: "text-amber-400 bg-amber-900/30 border-amber-700/40" },
    error: { icon: AlertCircle, label: "Error", cls: "text-red-400 bg-red-900/30 border-red-700/40" },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", cls)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// ── Granite health indicator ─────────────────────────────────────────────────

function GraniteHealthCard({ health }: { health: SystemStats["granite"] | null }) {
  if (!health) return <div className="h-24 rounded-xl bg-slate-800 animate-pulse" />;
  const map = {
    connected: { icon: Cpu, color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-700/30", label: "Connected" },
    mock: { icon: CloudOff, color: "text-amber-400", bg: "bg-amber-900/20 border-amber-700/30", label: "Mock Mode" },
    error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-900/20 border-red-700/30", label: "Error" },
  };
  const { icon: Icon, color, bg, label } = map[health.status];
  return (
    <div className={cn("rounded-xl border p-4", bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-6 w-6 mt-0.5 shrink-0", color)} />
        <div>
          <p className="text-sm font-semibold text-white">IBM Granite — {label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{health.message}</p>
          <p className="text-xs text-slate-500 mt-1">Model: {health.model}</p>
        </div>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

// ── Drag-and-drop uploader ────────────────────────────────────────────────────

function PDFUploader({ onUploaded }: { onUploaded: () => void }) {
  const { addToast } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      addToast("error", "Only PDF files are accepted");
      return;
    }
    setUploading(true);
    try {
      await apiClient.uploadDocument(file);
      addToast("success", "Uploaded!", "Indexing started in background. Refresh in a moment.");
      onUploaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      addToast("error", "Upload failed", msg);
    } finally {
      setUploading(false);
    }
  }, [addToast, onUploaded]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => fileRef.current?.click()}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 border-dashed p-10 transition-all text-center",
        dragging
          ? "border-blue-500 bg-blue-600/10"
          : "border-slate-700 hover:border-slate-600 bg-slate-900 hover:bg-slate-800/50"
      )}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
          <p className="text-sm text-slate-400">Uploading and queuing indexing…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-300">
              Drag & drop a PDF or <span className="text-blue-400">click to browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              College brochures, prospectus, fee structures, admission circulars
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/chat");
    }
  }, [user, router]);

  const fetchAll = useCallback(async () => {
    try {
      const [statsData, docsData] = await Promise.all([
        apiClient.getStats(),
        apiClient.getDocuments(),
      ]);
      setStats(statsData);
      setDocuments(docsData);
    } catch {
      addToast("error", "Failed to load admin data");
    } finally {
      setLoadingDocs(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 8000); // auto-refresh for pending status
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleDelete = useCallback(async (docId: number, filename: string) => {
    if (!confirm(`Delete "${filename}" and all its indexed chunks?`)) return;
    try {
      await apiClient.deleteDocument(docId);
      addToast("success", "Document deleted", `${filename} removed from knowledge base.`);
      fetchAll();
    } catch {
      addToast("error", "Delete failed");
    }
  }, [addToast, fetchAll]);

  const handleReindex = useCallback(async (docId: number, filename: string) => {
    try {
      await apiClient.reindexDocument(docId);
      addToast("info", "Re-indexing started", `${filename} is being re-processed.`);
      fetchAll();
    } catch {
      addToast("error", "Re-index failed");
    }
  }, [addToast, fetchAll]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 px-4 md:px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage college documents, monitor indexing status, and view system health.
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Chunks"
          value={stats?.vector_store.total_chunks ?? "—"}
          icon={Database}
          color="bg-blue-900/30 text-blue-400"
        />
        <StatCard
          label="Documents"
          value={documents.filter((d) => d.status === "indexed").length}
          icon={FileText}
          color="bg-violet-900/30 text-violet-400"
        />
        <StatCard
          label="Total Users"
          value={stats?.usage.total_users ?? "—"}
          icon={Users}
          color="bg-emerald-900/30 text-emerald-400"
        />
        <StatCard
          label="Total Messages"
          value={stats?.usage.total_messages ?? "—"}
          icon={MessageSquare}
          color="bg-amber-900/30 text-amber-400"
        />
      </div>

      {/* ── Granite health ── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          IBM Granite Connection
        </h2>
        <GraniteHealthCard health={stats?.granite ?? null} />
      </div>

      {/* ── Upload ── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Upload New Document
        </h2>
        <PDFUploader onUploaded={fetchAll} />
      </div>

      {/* ── Documents table ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Knowledge Base ({documents.length} file{documents.length !== 1 ? "s" : ""})
          </h2>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loadingDocs ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-900 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
            <FolderOpen className="h-12 w-12 text-slate-700 mb-3" />
            <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
            <p className="text-slate-600 text-xs mt-1">
              Upload a PDF brochure above to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Filename</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Chunks</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">Uploaded</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                        <span className="text-slate-200 font-medium truncate max-w-[180px]">
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {doc.status === "indexed" ? doc.chunk_count : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                      {doc.error_message && (
                        <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate" title={doc.error_message}>
                          {doc.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {doc.uploaded_at ? formatDate(doc.uploaded_at) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleReindex(doc.id, doc.filename)}
                          title="Re-index"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
