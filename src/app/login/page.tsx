"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/examStore";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, User, ChevronRight, Sparkles, GraduationCap, ShieldCheck, Mail, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { user, loginUser } = useExamStore();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const redir = params.get("redirect");
      if (redir) {
        setRedirectPath(redir);
      }
    }
  }, []);

  // If already logged in, redirect to target page
  useEffect(() => {
    if (user) {
      router.push(redirectPath);
    }
  }, [user, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    const body = isRegister 
      ? { username, password, displayName } 
      : { username, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong.");
      }

      if (isRegister) {
        setSuccessMsg("สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...");
        // Log in the newly registered user
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.success) {
          await loginUser(loginData.user);
          setTimeout(() => {
            router.push(redirectPath);
          }, 1500);
        } else {
          setIsRegister(false);
          setLoading(false);
        }
      } else {
        await loginUser(data.user);
        router.push(redirectPath);
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050b14] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-neon-blue/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-neon-purple/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <GraduationCap className="w-8 h-8 text-neon-blue" />
            <span className="text-2xl font-black tracking-tight font-heading">
              TGAT<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Sim</span>
            </span>
          </Link>
          <p className="text-slate-400 text-sm">
            ระบบจำลองข้อสอบและวิเคราะห์ผลลัพธ์ผ่าน Google Sheets
          </p>
        </div>

        {/* Card Frame */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          
          <h2 className="text-xl font-bold mb-6 text-white text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            {isRegister ? "สมัครสมาชิกใหม่" : "เข้าสู่ระบบผู้ใช้งาน"}
          </h2>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-semibold"
              >
                ⚠️ {error}
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs text-center font-semibold"
              >
                ✓ {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Display Name Input (Only on Register) */}
            {isRegister && (
              <div>
                <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                  ชื่อแสดงผล (Display Name)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย ใจดี"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/5 hover:border-slate-500 focus:border-neon-blue text-white placeholder-slate-500 rounded-xl transition-all duration-200 outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                บัญชีผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="เช่น student_user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-white/5 hover:border-slate-500 focus:border-neon-blue text-white placeholder-slate-500 rounded-xl transition-all duration-200 outline-none text-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-white/5 hover:border-slate-500 focus:border-neon-blue text-white placeholder-slate-500 rounded-xl transition-all duration-200 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-gradient-to-r from-neon-blue to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-neon-blue/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? "ลงทะเบียน" : "เข้าสู่ระบบ"}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register/Login Link */}
          <div className="mt-6 text-center text-xs text-slate-400">
            {isRegister ? (
              <p>
                มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError("");
                  }}
                  className="text-neon-blue hover:underline font-bold"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
            ) : (
              <p>
                ยังไม่มีบัญชีผู้ใช้งาน?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError("");
                  }}
                  className="text-neon-blue hover:underline font-bold"
                >
                  สมัครสมาชิกใหม่
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer Notes */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>ข้อมูลสมาชิกจัดเก็บอย่างปลอดภัยบนระบบ Cloud Google Sheets</span>
        </div>
      </div>
    </main>
  );
}
