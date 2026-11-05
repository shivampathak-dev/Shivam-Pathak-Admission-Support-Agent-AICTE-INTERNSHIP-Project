"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Plus, Trash2, MessageSquare, Bot, User, Sparkles,
  BookOpen, ChevronDown, ChevronUp, GraduationCap,
  IndianRupee, Calendar, Home, LogOut, Menu,
  Cpu, Mic, MicOff, Volume2, VolumeX,
  Shield, BarChart3
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { formatDate } from "@/lib/utils";
import type { ChatSession, ChatMessage, Source } from "@/types";
import NeuralBackground from "@/components/ui/NeuralBackground";

// ── Suggested prompts ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: GraduationCap, label: "B.Tech CSE eligibility criteria",    color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
  { icon: IndianRupee,   label: "What is the fee structure?",         color: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30" },
  { icon: Calendar,      label: "Application & admission deadlines",  color: "from-violet-500/20 to-violet-600/20 border-violet-500/30" },
  { icon: Home,          label: "Hostel fees and policies",           color: "from-orange-500/20 to-orange-600/20 border-orange-500/30" },
  { icon: BookOpen,      label: "Available courses and programmes",   color: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30" },
  { icon: Cpu,           label: "Placement stats and top recruiters", color: "from-pink-500/20 to-pink-600/20 border-pink-500/30" },
];

// ── Web Speech API types (not in default TS lib — use `any` wrappers) ─────────
type SpeechRecognitionAny = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((e: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: new () => SpeechRecognitionAny;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: new () => SpeechRecognitionAny;
  }
}

// ── Source citation chip ──────────────────────────────────────────────────────
function SourceChips({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <div className="mt-2.5">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-300 transition-colors group">
        <BookOpen className="w-3 h-3" />
        <span>{sources.length} source{sources.length > 1 ? "s" : ""} cited</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700/50 rounded-lg text-xs text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {s.filename} · p.{s.page}
                {s.score !== undefined && <span className="text-slate-500">{Math.round(s.score * 100)}%</span>}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg, isStreaming, onSpeak, isSpeaking
}: {
  msg: ChatMessage & { sources?: Source[] };
  isStreaming?: boolean;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${
        isUser
          ? "bg-gradient-to-br from-blue-500 to-indigo-600"
          : "bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50"
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-300" />}
      </div>

      <div className={`max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
          isUser
            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-sm"
            : "bg-slate-800/90 border border-slate-700/50 text-slate-100 rounded-tl-sm backdrop-blur-sm"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:my-1.5 prose-p:leading-relaxed
              prose-headings:text-blue-300 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5
              prose-strong:text-white prose-strong:font-semibold
              prose-code:text-blue-300 prose-code:bg-blue-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs
              prose-pre:bg-slate-900/80 prose-pre:border prose-pre:border-slate-700/50 prose-pre:rounded-xl
              prose-ul:my-1.5 prose-li:my-0.5
              prose-table:text-xs prose-th:text-slate-300 prose-td:border-slate-700/50 prose-th:border-slate-700/50">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              {isStreaming && (
                <span className="inline-flex items-center gap-0.5 ml-1 translate-y-0.5">
                  {[0,1,2].map(i => (
                    <motion.span key={i} className="w-1 h-1 rounded-full bg-blue-400 inline-block"
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions row */}
        {!isUser && msg.content && !isStreaming && onSpeak && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onSpeak(msg.content)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                isSpeaking ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
              }`}>
              {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {isSpeaking ? "Stop" : "Read aloud"}
            </button>
          </div>
        )}

        {!isUser && <SourceChips sources={msg.sources ?? []} />}
      </div>
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 flex items-center justify-center">
        <Bot className="w-4 h-4 text-blue-300" />
      </div>
      <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
        <span className="text-xs text-slate-400">IBM Granite is thinking</span>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [sessions, setSessions]           = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages]           = useState<(ChatMessage & { sources?: Source[] })[]>([]);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [thinking, setThinking]           = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // Voice input state
  const [listening, setListening]       = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);

  // Voice output state
  const [speakingMsgId, setSpeakingMsgId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef       = useRef<AbortController | null>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages, thinking]);

  // Check voice support
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRec && !!window.speechSynthesis);
  }, []);

  // Load sessions
  useEffect(() => { apiClient.getSessions().then(setSessions).catch(() => {}); }, []);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSession) return;
    apiClient.getMessages(activeSession.id)
      .then(msgs => setMessages(msgs.map((m: ChatMessage & { sources?: Source[] }) => ({
        ...m,
        sources: typeof m.sources === "string" ? JSON.parse((m.sources as unknown as string) || "[]") : (m.sources ?? [])
      }))))
      .catch(() => {});
  }, [activeSession]);

  // ── Voice input ────────────────────────────────────────────────────────────
  const toggleListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";

    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
      }
    };
    rec.onerror = () => { setListening(false); addToast("error", "Voice error", "Could not capture audio."); };
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
  }, [listening, addToast]);

  // ── Voice output ───────────────────────────────────────────────────────────
  const speakText = useCallback((text: string, msgId: number) => {
    if (!window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_`#>~\[\]]/g, "").replace(/\n+/g, " ").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "en-US";
    utt.rate = 0.95;
    utt.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.lang === "en-US");
    if (preferred) utt.voice = preferred;

    utt.onend = () => setSpeakingMsgId(null);
    utt.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utt);
  }, [speakingMsgId]);

  // ── Session management ─────────────────────────────────────────────────────
  const createNewSession = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
    setActiveSession(null);
    setMessages([]);
    setInput("");
    setMobileSidebar(false);
  }, []);

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiClient.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) { setActiveSession(null); setMessages([]); }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const sendMessage = async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || sending) return;

    window.speechSynthesis?.cancel();
    setSpeakingMsgId(null);
    setSending(true);
    setThinking(true);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const tempUserMsg: ChatMessage & { sources?: Source[] } = {
      id: Date.now(), session_id: activeSession?.id ?? 0,
      role: "user", content: query, created_at: new Date().toISOString(), sources: []
    };
    const tempAiId = Date.now() + 1;
    setMessages(prev => [...prev, tempUserMsg, {
      id: tempAiId, session_id: activeSession?.id ?? 0,
      role: "assistant", content: "", created_at: new Date().toISOString(), sources: []
    }]);

    let fullText = "";
    let sources: Source[] = [];

    try {
      abortRef.current = new AbortController();
      const response = await fetch("/api/chat/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiClient.getToken()}` },
        body: JSON.stringify({ message: query, session_id: activeSession?.id ?? null }),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");
      setThinking(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "sources") {
              sources = data.sources;
              setMessages(prev => prev.map(m => m.id === tempAiId ? { ...m, sources } : m));
            } else if (data.type === "token") {
              fullText += data.token;
              setMessages(prev => prev.map(m => m.id === tempAiId ? { ...m, content: fullText } : m));
            } else if (data.type === "done" && data.session_id) {
              const updated = await apiClient.getSessions();
              setSessions(updated);
              const sess = updated.find((s: ChatSession) => s.id === data.session_id);
              if (sess) setActiveSession(sess);
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        addToast("error", "Connection error", "Could not reach the AI server.");
        setMessages(prev => prev.map(m => m.id === tempAiId
          ? { ...m, content: "⚠️ I couldn't connect to the server. Please check the backend is running." }
          : m));
      }
    } finally {
      setSending(false);
      setThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none relative overflow-hidden">

      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-20 right-0 w-36 h-36 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none translate-x-1/2" />

      {/* ── Brand header ── */}
      <div className="relative px-4 pt-5 pb-4">
        {/* Logo + name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {/* live pulse dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-[#0c1220]" />
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight tracking-tight">Admission Agent</p>
            <p className="text-[10px] text-blue-400 font-medium leading-tight">IBM Granite · RAG Active</p>
          </div>
        </div>

        {/* Divider with gradient */}
        <div className="h-px bg-gradient-to-r from-blue-500/40 via-indigo-500/20 to-transparent mb-4" />

        {/* New conversation button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={createNewSession}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-blue-600/25 border border-blue-400/20"
        >
          <Plus className="w-4 h-4" />
          New conversation
        </motion.button>
      </div>

      {/* ── Sessions list ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {sessions.length > 0 && (
          <div className="flex items-center gap-2 px-2 mb-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Recent chats</p>
            <div className="flex-1 h-px bg-slate-800/80" />
            <span className="text-[10px] text-slate-600 font-medium">{sessions.length}</span>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {sessions.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-xs font-medium text-slate-500">No conversations yet</p>
              <p className="text-[10px] text-slate-600 mt-1">Start a new chat above</p>
            </motion.div>
          )}
          {sessions.map((s) => (
            <motion.div
              key={s.id} layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
              className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-all ${
                activeSession?.id === s.id
                  ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30 text-white shadow-sm shadow-blue-500/10"
                  : "hover:bg-slate-800/70 border border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700/50"
              }`}
              onClick={() => { setActiveSession(s); setMobileSidebar(false); }}
            >
              {/* active left accent bar */}
              {activeSession?.id === s.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-blue-400 to-indigo-400 rounded-full" />
              )}
              <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${activeSession?.id === s.id ? "text-blue-400" : "text-slate-600 group-hover:text-slate-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.title}</p>
                <p className={`text-[10px] mt-0.5 ${activeSession?.id === s.id ? "text-blue-400/70" : "text-slate-600"}`}>
                  {formatDate(s.updated_at)}
                </p>
              </div>
              <button
                onClick={e => deleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/15 text-slate-600 hover:text-red-400 transition-all shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div className="relative border-t border-slate-800/60 p-3 space-y-1">
        {/* gradient line on top */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

        {user?.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Dashboard</span>
            <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
          </Link>
        )}

        {/* User card */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700/40">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[12px] font-bold text-white shrink-0 shadow-md shadow-blue-500/20">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#080d1a] overflow-hidden relative">

      {/* ── Ambient Video Animation Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
          src="/chat-bg.mp4"
        />
        {/* Soft vignette overlay to preserve high contrast for text */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/85 via-[#080d1a]/60 to-[#080d1a]/90 backdrop-blur-[0.5px]" />
      </div>

      {/* ── Neural network canvas background ── */}
      <NeuralBackground active={sending || thinking} />

      {/* ── Desktop sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="hidden md:flex flex-col bg-[#0c1220] border-r border-slate-800/50 shrink-0 overflow-hidden"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Mobile sidebar ── */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setMobileSidebar(false)} />
            <motion.aside
              initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c1220] border-r border-slate-800/50 z-50 flex flex-col md:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-[#0c1220]/80 backdrop-blur-xl border-b border-slate-800/50 shrink-0 z-10">
          <button
            onClick={() => { setSidebarOpen(v => !v); setMobileSidebar(v => !v); }}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/60 transition-all">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {activeSession?.title ?? "New Conversation"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-slate-500">IBM Granite · Active</span>
              </div>
            </div>
          </div>

          {user?.role === "admin" && (
            <Link href="/admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-medium hover:bg-amber-500/20 transition-all">
              <BarChart3 className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            <AnimatePresence>
              {messages.length === 0 && !thinking && (
                <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="flex flex-col items-center text-center pt-8 pb-4 gap-6">
                  {/* Animated icon */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}>
                    <div className="relative">
                      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/15 to-indigo-600/15 border border-blue-500/15 flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-blue-400" />
                      </div>
                      <motion.div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#080d1a]"
                        animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                    </div>
                  </motion.div>

                  <div className="space-y-2.5">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/25 text-xs text-blue-300 backdrop-blur-md shadow-lg shadow-blue-500/10"
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      IBM Granite 3-8B · RAG Knowledge Base Active
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Hi {user?.name?.split(" ")[0] ?? "there"} 👋
                    </h2>
                    <p className="text-slate-400 text-sm max-w-md leading-relaxed">
                      I&apos;m your AI Admission Counsellor powered by <span className="text-blue-400 font-medium">IBM Granite</span>.
                      Ask me anything about eligibility, fees, courses, hostel, or placements.
                    </p>
                  </div>

                  {/* Suggestion cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full max-w-2xl mt-2">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button key={s.label}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.07 }}
                        whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => sendMessage(s.label)}
                        className={`flex items-center gap-3 p-3.5 bg-gradient-to-br ${s.color} rounded-xl text-left transition-all group border`}>
                        <div className="w-8 h-8 rounded-lg bg-slate-900/40 flex items-center justify-center shrink-0">
                          <s.icon className="w-4 h-4 text-white/80" />
                        </div>
                        <span className="text-xs text-slate-300 group-hover:text-white transition-colors font-medium leading-snug">{s.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {voiceSupported && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                      className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Mic className="w-3 h-3" /> Voice input available — click the mic in the input bar
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {messages.map((msg, i) => (
              <MessageBubble key={msg.id} msg={msg}
                isStreaming={sending && i === messages.length - 1 && msg.role === "assistant"}
                onSpeak={voiceSupported ? (text) => speakText(text, msg.id) : undefined}
                isSpeaking={speakingMsgId === msg.id}
              />
            ))}

            <AnimatePresence>{thinking && <TypingIndicator />}</AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Input bar ── */}
        <div className="bg-[#0c1220]/80 backdrop-blur-xl border-t border-slate-800/50 px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className={`flex items-end gap-2 bg-slate-800/60 border rounded-2xl px-3 py-2 transition-all ${
              listening ? "border-red-500/50 shadow-lg shadow-red-500/10" : "border-slate-700/50 focus-within:border-blue-500/50 focus-within:shadow-lg focus-within:shadow-blue-500/5"
            }`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={listening ? "🎤 Listening… speak now" : "Ask about admissions, fees, courses, hostel…"}
                rows={1}
                disabled={sending}
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none py-1.5 max-h-40 leading-relaxed"
              />

              <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                {/* Voice input button */}
                {voiceSupported && (
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={toggleListening}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                      listening
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/50"
                    }`}
                    title={listening ? "Stop listening" : "Voice input"}
                  >
                    {listening
                      ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><MicOff className="w-4 h-4" /></motion.div>
                      : <Mic className="w-4 h-4" />
                    }
                  </motion.button>
                )}

                {/* Send button */}
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 rounded-xl text-white transition-all shadow-md shadow-blue-600/20 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {sending
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                </motion.button>
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-700 mt-2">
              Grounded in official college documents via IBM Granite AI · Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
