"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  MessageSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV = [
  { href: "/chat", label: "AI Counsellor", icon: MessageSquare, role: null },
  { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, role: "admin" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    addToast("info", "Signed out", "See you next time!");
    router.push("/login");
  }

  const visibleNav = NAV.filter(
    (item) => !item.role || item.role === user?.role
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <nav className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/chat" className="flex items-center gap-2.5">
          <div className="bg-blue-600/15 border border-blue-600/30 p-1.5 rounded-lg">
            <GraduationCap className="h-5 w-5 text-blue-500" />
          </div>
          <span className="font-bold text-white text-sm hidden sm:block">
            Admission <span className="text-blue-400">Agent</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-blue-600/15 text-blue-400 font-medium"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User area */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-sm text-slate-300 max-w-[120px] truncate">
                {user.name}
              </span>
              {user.role === "admin" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 border border-violet-700/40 text-violet-300 font-medium">
                  ADMIN
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign out</span>
          </button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-1"
        >
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-lg text-sm",
                  active
                    ? "bg-blue-600/15 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </Link>
            );
          })}
        </motion.div>
      )}
    </header>
  );
}
