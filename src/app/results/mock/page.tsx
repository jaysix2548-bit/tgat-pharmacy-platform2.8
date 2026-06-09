"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, BarChart2, Clock, CheckCircle, Target, TrendingUp, AlertTriangle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import ReadinessRadar from "@/components/results/ReadinessRadar";
import WeaknessHeatmap from "@/components/results/WeaknessHeatmap";
import QuestionReviewList from "@/components/results/QuestionReviewList";
import { SafeHtml } from "@/components/SafeHtml";

export default function MockResultPage() {
  const router = useRouter();
  const { mockSession, getHistory, resetMockExam } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!mockSession) {
    return (
      <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center text-white p-4">
        <p className="text-xl mb-4">No recent Mock Exam data found.</p>
        <Link href="/mock-exam" className="text-neon-blue underline font-bold">Go take the Mock Exam</Link>
      </div>
    );
  }

  // Calculate stats for the mock session (200 Questions)
  const total = mockSession.questions.length;
  const score = mockSession.score;
  const percentage = Math.round((score / total) * 100);

  // Divide into TGAT1, TGAT2, TGAT3
  let tgat1Correct = 0, tgat1Total = 0;
  let tgat2Correct = 0, tgat2Total = 0;
  let tgat3Correct = 0, tgat3Total = 0;

  // Track time bottleneck questions
  interface BottleneckItem {
    index: number;
    qId: string;
    topic: string;
    actualTime: number;
    estimatedTime: number;
    speedHack: string;
  }
  const bottlenecks: BottleneckItem[] = [];

  mockSession.questions.forEach((q, i) => {
    const isCorrect = mockSession.answers[i] === q.answer;
    
    // Categorize by ID prefixes
    if (q.id.startsWith("T1-")) {
      tgat1Total++;
      if (isCorrect) tgat1Correct++;
    } else if (q.id.startsWith("T2-")) {
      tgat2Total++;
      if (isCorrect) tgat2Correct++;
    } else if (q.id.startsWith("T3-")) {
      tgat3Total++;
      if (isCorrect) tgat3Correct++;
    }

    // Time Bottlenecks checks (Actual spent time over 1.5x target)
    const timeSpent = mockSession.perQuestionTime[i] || 0;
    if (timeSpent > q.estimatedTime * 1.5) {
      bottlenecks.push({
        index: i + 1,
        qId: q.id,
        topic: q.topic,
        actualTime: timeSpent,
        estimatedTime: q.estimatedTime,
        speedHack: q.speedHack,
      });
    }
  });

  // Calculate scaled scores (out of 100 points each)
  const tgat1Scaled = tgat1Total > 0 ? Math.round((tgat1Correct / tgat1Total) * 100) : 0;
  const tgat2Scaled = tgat2Total > 0 ? Math.round((tgat2Correct / tgat2Total) * 100) : 0;
  const tgat3Scaled = tgat3Total > 0 ? Math.round((tgat3Correct / tgat3Total) * 100) : 0;
  const totalScaled = Math.round(((tgat1Correct + tgat2Correct + tgat3Correct) / total) * 300);

  // Time Analysis
  const totalTimeSpent = 10800 - mockSession.timeRemaining;
  const timeMins = Math.floor(totalTimeSpent / 60);
  const timeSecs = totalTimeSpent % 60;
  const avgTimePerQ = Math.round(totalTimeSpent / total);

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 font-sans pb-28">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        
        {/* Header Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold mb-1">
              <ArrowLeft className="w-4 h-4" /> กลับสู่ Dashboard
            </Link>
            <h1 className="text-2xl font-black text-white">Full Mock Exam Analysis</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/my-mistakes" className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">
              ดูข้อที่ผิดพลาด
            </Link>
            <button 
              onClick={() => {
                if (window.confirm("คุณต้องการล้างข้อมูลเพื่อเริ่มสอบใหม่อีกรอบหรือไม่?")) {
                  resetMockExam();
                  router.push("/mock-exam");
                }
              }} 
              className="px-4 py-2.5 bg-neon-purple text-white font-bold rounded-xl text-xs flex items-center gap-2 hover:bg-purple-500 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              <RefreshCw className="w-4 h-4" /> ทำจำลองใหม่อีกครั้ง
            </button>
          </div>
        </div>

        {/* Global Scaled Score display */}
        <div className="bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-neon-purple/5 blur-[55px] pointer-events-none" />
          
          <div className="space-y-2">
            <span className="text-[10px] text-neon-purple font-black uppercase tracking-wider bg-neon-purple/10 px-2 py-0.5 rounded border border-neon-purple/20">
              Total Admission Score
            </span>
            <h2 className="text-3xl font-black text-white">
              คะแนนสะสมจริงในการจำลองวิชาชีพ
            </h2>
            <p className="text-slate-400 text-xs max-w-lg leading-relaxed">
              คะแนนรวมจากการทดสอบแบบจับเวลาจริง 3 ชั่วโมง ครอบคลุมพาร์ทภาษาพรีเมียม ตรรกศาสตร์การคิด และทัศนคติวิชาการสุขภาพ
            </p>
          </div>

          <div className="bg-slate-950/80 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[200px] text-center shadow-lg relative group">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Composite Score</span>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple mt-1.5 font-mono">
              {totalScaled}
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-2 border-t border-white/5 pt-1.5 w-full">
              คิดเป็น {percentage}% (ถูก {score} / 200 ข้อ)
            </span>
          </div>
        </div>

        {/* Subject wise scaled score display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* TGAT1 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 uppercase tracking-wider">TGAT1 English</span>
              <h4 className="font-extrabold text-white text-sm mt-2 leading-tight">English Communication</h4>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
              <span className="text-slate-400 text-xs">ถูกต้อง {tgat1Correct} / {tgat1Total} ข้อ</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">{tgat1Scaled} <span className="text-xs text-slate-500">/ 100</span></span>
            </div>
          </div>

          {/* TGAT2 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 uppercase tracking-wider">TGAT2 Logic</span>
              <h4 className="font-extrabold text-white text-sm mt-2 leading-tight">Logical & Critical Thinking</h4>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
              <span className="text-slate-400 text-xs">ถูกต้อง {tgat2Correct} / {tgat2Total} ข้อ</span>
              <span className="text-2xl font-black text-pink-400 font-mono">{tgat2Scaled} <span className="text-xs text-slate-500">/ 100</span></span>
            </div>
          </div>

          {/* TGAT3 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 uppercase tracking-wider">TGAT3 Future</span>
              <h4 className="font-extrabold text-white text-sm mt-2 leading-tight">Workforce Competencies</h4>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 flex items-end justify-between">
              <span className="text-slate-400 text-xs">ถูกต้อง {tgat3Correct} / {tgat3Total} ข้อ</span>
              <span className="text-2xl font-black text-orange-400 font-mono">{tgat3Scaled} <span className="text-xs text-slate-500">/ 100</span></span>
            </div>
          </div>
        </div>

        {/* Dynamic Readiness Radar */}
        <ReadinessRadar />

        {/* Weakness Heatmap grid visualizer */}
        <WeaknessHeatmap />

        {/* Time Bottlenecks Alerts block */}
        <div className="bg-slate-900/60 border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 mb-3 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" /> Time Bottlenecks Optimizer
            </div>
            <h3 className="text-xl font-black text-white leading-tight">
              วิเคราะห์วิกฤตความเร็วและการจัดการเวลา
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              ข้อสอบที่คุณใช้เวลาเกินกว่าเวลาเป้าหมาย (Suggest Target Time) 1.5 เท่า และนำมาอธิบายกลวิธีโกงวินาที
            </p>
          </div>

          {bottlenecks.length > 0 ? (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {bottlenecks.slice(0, 5).map((item, bIdx) => (
                <div key={bIdx} className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                      ข้อที่ {item.index} (ID: {item.qId}) - {item.topic}
                    </span>
                    <span className="text-[10px] text-yellow-500 font-black flex items-center gap-1">
                      ⚠️ เกินเป้า {item.actualTime - item.estimatedTime} วินาที
                    </span>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-semibold text-slate-300 leading-relaxed">
                    <span>เวลาจริงที่ใช้: {item.actualTime} วินาที</span>
                    <span>เป้าหมายที่ควรทำ: {item.estimatedTime} วินาที</span>
                  </div>

                  <div className="bg-pink-500/5 border border-pink-500/10 p-3 rounded-xl">
                    <h5 className="font-extrabold text-pink-400 text-[10px] mb-1">เทคนิคแก้วิกฤตเวลานี้ (Speed Hack):</h5>
                    <p className="text-slate-200 text-xs leading-relaxed">
                      <SafeHtml content={item.speedHack} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="font-extrabold text-white text-sm">
                การบริการด้านเวลาสมบูรณ์แบบ!
              </h4>
              <p className="text-[10px] text-slate-500 max-w-[280px] mt-1 leading-relaxed">
                คุณสามารถทำข้อสอบจำลองทั้งหมด 200 ข้อ ภายในสถิติที่กำหนดเป้าหมายเวลา ไม่มีข้อไหนที่ติดวิกฤตคอขวดเลย
              </p>
            </div>
          )}
        </div>

        {/* Detailed Question Review */}
        <QuestionReviewList 
          questions={mockSession.questions} 
          answers={mockSession.answers} 
          perQuestionTime={mockSession.perQuestionTime} 
        />
      </div>
    </main>
  );
}
