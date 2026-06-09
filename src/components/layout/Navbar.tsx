"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookMarked, Activity, Award, LayoutDashboard, Menu, X, FileText, LogOut, LogIn, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useExamStore } from "@/store/examStore";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, loginUser, logoutUser, streakCount } = useExamStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Check if session cookie exists on mount to keep store in sync
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          const currentStore = useExamStore.getState();
          if (!currentStore.user || currentStore.user.userId !== data.user.userId) {
            loginUser(data.user);
          }
        } else {
          const currentStore = useExamStore.getState();
          if (currentStore.user) {
            logoutUser();
          }
        }
      })
      .catch((err) => {
        console.error("Session check failed:", err);
      });
  }, [loginUser, logoutUser]);

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/my-mistakes", label: "Mistake Notebook", icon: <BookMarked className="w-4 h-4 text-red-400" /> },
    { href: "/mock-exam", label: "Mock Exam", icon: <FileText className="w-4 h-4" /> },
    { href: "/tgat1", label: "TGAT1", icon: <BookOpen className="w-4 h-4" /> },
    { href: "/tgat2", label: "TGAT2", icon: <Activity className="w-4 h-4" /> },
    { href: "/tgat3", label: "TGAT3", icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#050b14]/85 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="font-semibold text-lg tracking-tight flex items-center gap-1.5">
            <span className="text-white font-heading">TGAT</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 font-heading">Sim</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-white/5 text-white border border-white/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon} <span>{link.label}</span>
                </Link>
              );
            })}

            <div className="h-4 w-px bg-white/10 mx-2" />

            {user ? (
              <div className="flex items-center gap-3 pl-1">
                {streakCount > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/25 rounded-full text-orange-400 font-bold text-xs font-mono shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                    <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                    <span>{streakCount} {streakCount === 1 ? 'day' : 'days'}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black border border-white/10 shadow-lg shadow-blue-500/15">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="text-sm font-semibold text-slate-200 max-w-[100px] truncate">
                    {user.displayName}
                  </span>
                </div>
                <button
                  onClick={() => logoutUser()}
                  className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-neon-blue to-violet-500 text-white rounded-lg text-xs font-bold transition-all hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.2)] border border-white/10"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-300 hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-[#050b14]/95 backdrop-blur-md border-b border-white/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium ${
                    pathname.startsWith(link.href)
                      ? 'bg-white/5 text-white border border-white/5'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon} <span>{link.label}</span>
                </Link>
              ))}

              <div className="h-px bg-white/10 my-3" />

              {user ? (
                <div className="space-y-3 p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-black border border-white/10">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white leading-tight">{user.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{user.role}</div>
                      </div>
                    </div>
                    {streakCount > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 border border-orange-500/25 rounded-full text-orange-400 font-bold text-xs font-mono">
                        <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                        <span>{streakCount} {streakCount === 1 ? 'day' : 'days'}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      logoutUser();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-sm transition-all hover:bg-red-500/10 active:scale-95"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-gradient-to-r from-neon-blue to-violet-500 text-white font-bold text-sm transition-all hover:brightness-110 active:scale-95 border border-white/10"
                  >
                    <LogIn className="w-4 h-4" /> Sign In
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
