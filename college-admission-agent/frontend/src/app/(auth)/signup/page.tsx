"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Sparkles, AlertCircle, CheckCircle2, Zap, ShieldCheck, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? colors[score - 1] : "bg-white/10"}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(c => (
          <span key={c.label} className={`flex items-center gap-1 text-xs transition-colors ${c.ok ? "text-emerald-400" : "text-slate-500"}`}>
            <CheckCircle2 className="w-3 h-3" /> {c.label}
          </span>
        ))}
      </div>
      {score > 0 && <p className={`text-xs font-medium ${colors[score - 1].replace("bg-", "text-")}`}>{labels[score - 1]} password</p>}
    </motion.div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { register, user, isLoading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !!user) router.replace("/chat");
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-90 scale-105"
            src="/login-bg.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-[#080d1a]/80" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#080d1a]" />
          <div className="absolute inset-0 bg-blue-950/20 mix-blend-color-dodge pointer-events-none" />
        </div>

        {/* Brand Header */}
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

        {/* Hero Copy */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-xs font-semibold text-blue-300 backdrop-blur-md shadow-lg shadow-blue-500/10"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Join Prospective Students Portal
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-tight"
          >
            Your Personal <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              College Counsellor
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-slate-300 text-sm leading-relaxed"
          >
            Create an account to ask questions, explore engineering branches, compute fees, review scholarships, and inspect verified cutoffs with citations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="grid grid-cols-3 gap-3 pt-2"
          >
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-lg">
              <Zap className="w-4 h-4 text-blue-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Interactive RAG</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Streaming answers</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Official PDFs</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Direct page citations</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/50 backdrop-blur-md shadow-lg">
              <GraduationCap className="w-4 h-4 text-indigo-400 mb-1.5" />
              <p className="text-xs font-semibold text-white">Full Access</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Save chat history</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/70 pt-4"
        >
          <span>AICTE / IBM SkillsBuild Internship</span>
          <span className="flex items-center gap-2 text-blue-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            24x7 AI Assistance
          </span>
        </motion.div>
      </div>

      {/* ── Right Column: Sign Up Form Card ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-3 border border-white/10">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">College Admission Agent</h1>
            <p className="text-slate-400 text-xs mt-1">Powered by IBM Granite AI & ChromaDB</p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
              <p className="text-slate-400 text-sm mt-1 mb-6">Get started with the AI Admission Counsellor</p>

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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder="e.g. Shivam Pathak"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="student@example.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-700/60 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Create a strong password"
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
                  <PasswordStrength password={password} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      placeholder="Repeat your password"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-950/60 border rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-all ${
                        confirm && confirm !== password
                          ? "border-red-500/50 focus:ring-red-500/30"
                          : "border-slate-700/60 focus:ring-blue-500/50 focus:border-blue-500"
                      }`}
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-400">
                      Passwords do not match
                    </motion.p>
                  )}
                </div>

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
                    <UserPlus className="w-4 h-4" />
                  )}
                  {loading ? "Creating account…" : "Create Account"}
                </motion.button>
              </form>

              <div className="text-center text-sm text-slate-400 mt-6">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}
