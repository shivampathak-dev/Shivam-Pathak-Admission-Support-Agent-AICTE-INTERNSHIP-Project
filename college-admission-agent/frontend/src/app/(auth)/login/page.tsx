"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, LogIn, Sparkles, AlertCircle, ShieldCheck, Zap, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !!user) router.replace("/chat");
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-[#080d1a] overflow-hidden">
      
      {/* ── Mobile / Small Screens Ambient Video Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none lg:hidden overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
          src="/login-bg.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/80 via-[#080d1a]/60 to-[#080d1a]/95 backdrop-blur-sm" />
      </div>

      {/* ── Left Column: Interactive 3D Video Showcase (Desktop) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800/60 z-10">
        {/* Full Video Player */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-90 scale-105"
            src="/login-bg.mp4"
          />
          {/* Subtle gradient vignettes for seamless blending */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-[#080d1a]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#080d1a]" />
          <div className="absolute inset-0 bg-blue-950/20 mix-blend-color-dodge pointer-events-none" />
        </div>

        {/* Top Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/10">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Admission Agent</h2>
            <p className="text-xs text-blue-400 font-medium tracking-wide">IBM Granite 3-8B · AICTE Project</p>
          </div>
        </motion.div>

        {/* Hero Copy & Badges */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-lg shadow-blue-500/10"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            RAG-Powered Admission Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight"
          >
            Smarter Guidance. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Zero Hallucinations.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-slate-300 text-sm leading-relaxed"
          >
            Ask anything about eligibility, deadlines, tuition fees, scholarships, and campus hostels. Every response is strictly grounded in official brochures.
          </motion.p>

          {/* Feature Highlights Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="grid grid-cols-3 gap-3 pt-2"
          >
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-lg">
              <Zap className="w-4 h-4 text-blue-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Fast ChromaDB</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Top-k semantic search</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Strict Guardrails</p>
              <p className="text-[10px] text-slate-400 mt-0.5">No fabricated stats</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-lg">
              <GraduationCap className="w-4 h-4 text-indigo-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">IBM Granite</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Instruction tuned</p>
            </div>
          </motion.div>
        </div>

        {/* Footer Status Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/70 pt-4"
        >
          <span>AICTE / IBM SkillsBuild Internship</span>
          <span className="flex items-center gap-2 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            RAG Knowledge Base Ready
          </span>
        </motion.div>
      </div>

      {/* ── Right Column: Sign In Card ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Mobile Header Branding */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-3 border border-white/10">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">College Admission Agent</h1>
            <p className="text-slate-400 text-xs mt-1">Powered by IBM Granite AI & ChromaDB</p>
          </div>

          {/* Form Glass Card */}
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
              <p className="text-slate-400 text-sm mt-1 mb-6">Sign in to consult the AI Admission Counsellor</p>

              {/* Error Alert */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm mb-5"
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="admin@college.edu"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 bg-slate-950/60 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-xl shadow-blue-600/25 border border-blue-400/20"
                >
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  {loading ? "Authenticating…" : "Sign In"}
                </motion.button>
              </form>

              <div className="text-center text-sm text-slate-400 mt-6">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  Create student account
                </Link>
              </div>

              {/* Demo Hint Banner */}
              <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40 rounded-xl px-3.5 py-2.5 border border-slate-800/50">
                <span className="text-slate-400">Admin Demo:</span>
                <span className="font-mono text-blue-300">admin@college.edu / Admin1234</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
