"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useExamStore } from "@/store/examStore";
import { 
  BookOpen, 
  Activity, 
  AlertCircle, 
  Play, 
  FileText, 
  Award, 
  Sparkles, 
  GraduationCap, 
  BrainCircuit, 
  Clock, 
  ShieldAlert,
  Flame,
  Zap,
  Target,
  HeartPulse
} from "lucide-react";
import { motion } from "framer-motion";
import ReadinessRadar from "@/components/results/ReadinessRadar";
import WeaknessHeatmap from "@/components/results/WeaknessHeatmap";
import DailyBoosterWidget from "@/components/dashboard/DailyBoosterWidget";
import RevisionSchedulerWidget from "@/components/dashboard/RevisionSchedulerWidget";
import StudyPlanWidget from "@/components/dashboard/StudyPlanWidget";
import PerformanceCharts from "@/components/dashboard/PerformanceCharts";
import TopicMasteryTracker from "@/components/dashboard/TopicMasteryTracker";
import RecentActivitiesWidget from "@/components/dashboard/RecentActivitiesWidget";
import { SafeHtml } from "@/components/SafeHtml";

export default function DashboardPage() {
  const { examHistory, mistakes, streakCount } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center text-primary-500 font-bold font-mono">
        Loading Premium EdTech Dashboard...
      </div>
    );
  }

  const tgat1History = examHistory.filter(h => h.examId === 'tgat1');
  const tgat2History = examHistory.filter(h => h.examId === 'tgat2');
  const tgat3History = examHistory.filter(h => h.examId === 'tgat3');

  const getBestScore = (history: { score: number; total: number }[]) => {
    if (history.length === 0) return 0;
    return Math.max(...history.map(h => (h.score / h.total) * 100));
  };

  const totalMistakes = Object.keys(mistakes).length;

  // Calculate composite readiness score
  const getCompositeReadiness = () => {
    if (examHistory.length === 0) return 68; // default seed
    const totalCorrect = examHistory.reduce((acc, h) => acc + h.score, 0);
    const totalQuestions = examHistory.reduce((acc, h) => acc + h.total, 0);
    const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 70;
    return Math.max(10, Math.min(99, Math.round(accuracy - Object.keys(mistakes).length * 1.5)));
  };

  const compositeReadiness = getCompositeReadiness();
  const predictedScore = Math.round(100 + (compositeReadiness / 100) * 190);

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-6 md:p-12 font-sans pb-28">
      <div className="max-w-5xl mx-auto space-y-16 md:space-y-24 relative z-10">
        
        {/* Apple/Vercel Style Premium Header */}
        <div className="saas-card flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[45px] pointer-events-none rounded-full" />
          
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="heading-xl text-white">
                คอนโซลแดชบอร์ด
              </h1>
              <span className="text-[10px] font-medium text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                SaaS Diagnostics
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              ระบบวิเคราะห์ข้อมูลผลสอบอัจฉริยะ (Adaptive diagnostics) และบอร์ดติวเข้มรายหัวข้อส่วนบุคคล
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Streak Widget */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
              <Flame className="w-5 h-5 text-orange-400 fill-orange-400/20" />
              <span className="text-xs font-medium text-white font-mono">{streakCount} วันต่อเนื่อง</span>
            </div>

            <Link 
              href="/my-mistakes"
              className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-2xl transition-all text-xs font-bold shadow-md shadow-red-500/5"
            >
              <BookOpen className="w-4.5 h-4.5 text-red-400" /> สมุดจดข้อผิด ({totalMistakes})
            </Link>

            <Link 
              href="/mock-exam"
              className="btn-primary"
            >
              <Play className="w-4 h-4 text-white mr-1.5" /> สอบจำลองเสมือนจริง
            </Link>
          </div>
        </div>

        {/* 1. Readiness Score Card & Predicted Score Widget (Top Row) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="saas-card flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[25px] pointer-events-none rounded-full" />
            
            <div>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                Composite Readiness
              </span>
              <h3 className="heading-md text-white mt-3">ประเมินความพร้อมจำลอง</h3>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">ความพร้อมสะสม</span>
                  <span className="text-white font-bold font-mono">{compositeReadiness}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${compositeReadiness}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-xs text-slate-400 font-medium">คะแนนคาดการณ์ (Predicted)</span>
                <span className="text-lg font-bold text-blue-400 font-mono">
                  {predictedScore} <span className="text-xs text-slate-500">/ 300</span>
                </span>
              </div>
            </div>
          </div>

          {/* 8. Mock Exam Shortcut Card (Wow Banner, Col Span 2) */}
          <div className="md:col-span-2 saas-card bg-slate-900/30 border-white/5 shadow-none flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[55px] pointer-events-none rounded-full" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-slate-400 text-[10px] font-medium select-none">
                  <GraduationCap className="w-4 h-4 text-slate-400" /> Full Simulation Arena
                </span>
                <h3 className="heading-lg text-white leading-tight">
                  TGAT Full Combined Mock Test
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-lg">
                  สัมผัสการทำข้อสอบจำลองเสมือนจริง 3 ชั่วโมงเต็ม (อังกฤษ 60, ตรรกะ 80, สมรรถนะ 60) คะแนนเต็ม 300 คะแนน พร้อมระบบวิเคราะห์ความเร็ว Bottlenecks
                </p>
              </div>

              <Link 
                href="/mock-exam" 
                className="btn-primary flex-shrink-0"
              >
                เริ่มสอบจำลอง 3 ชม. <Play className="w-4 h-4 fill-white ml-1.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Daily Weakness Booster Card */}
        <DailyBoosterWidget />

        {/* 6 & 7. Recharts Weekly & Monthly Performance charts */}
        <PerformanceCharts />

        {/* 13 & 10. Topic Mastery and Forecast metrics */}
        <TopicMasteryTracker />

        {/* 9 & 15. Spaced Repetition queue & adaptive Study Plan calendars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RevisionSchedulerWidget />
          <StudyPlanWidget />
        </div>

        {/* 11 & 14. Log Activities & Time Bottleneck Warning Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RecentActivitiesWidget />
          
          {/* 14. Time Bottleneck Alerts Widget */}
          <div className="saas-card flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[45px] pointer-events-none rounded-full" />
            
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-400" /> Time Bottleneck Alerts
                </h3>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider font-mono">
                  Speed Warnings
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-white text-xs leading-tight">ข้อสอบวิชาชีพ TGAT1 ห้ามเกิน 45 วินาที</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      หากใช้เวลากลุ่มบทความเกือบ 120 วินาที จะทำให้ข้อสุดท้ายปล่อยว่าง ทบทวนเทคนิค Speed Hack ด่วน!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-white text-xs leading-tight">ข้อสอบพับกล่องมิติสัมพันธ์ ห้ามเกิน 60 วินาที</h5>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      ช้อยส์ด้านตรงข้ามจะไม่มีทางมาสัมผัสกัน ให้ตัดตัวเลือกผิดออกทันทีห้ามจินตนาการหมุนกล่องในหัว
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Cumulative Weakness Heatmap widget */}
        <WeaknessHeatmap />



        {/* Individual subject selectors */}
        <div>
          <div className="text-center mb-8">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
              Individual Syllabus Training
            </span>
            <h2 className="heading-lg text-white mt-1">เจาะลึกทบทวนรายวิชาเฉพาะ</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TGAT1 */}
            <div className="saas-card saas-card-hover flex flex-col group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="heading-md text-white group-hover:text-primary-500 transition-colors">TGAT1</h3>
                  <p className="text-xs text-slate-400">English Communication</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 mb-6">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-300 font-bold">สถิติสูงสุด</span>
                  <span className="text-lg font-black text-primary-500">{Math.round(getBestScore(tgat1History))}%</span>
                </div>
                {tgat1History.length > 0 && (
                  <div className="flex justify-end pr-1">
                    <Link href="/results/tgat1" className="text-[11px] text-primary-400 hover:text-primary-300 hover:underline flex items-center gap-1 font-semibold transition-all">
                      ดูผลสอบล่าสุด &rarr;
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <Link href="/tgat1/study" className="flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold text-xs transition-all">
                  <FileText className="w-4 h-4" /> ติวเนื้อหา
                </Link>
                <Link href="/tgat1" className="flex items-center justify-center gap-2 py-2 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 text-primary-500 rounded-xl font-bold text-xs transition-all">
                  <Play className="w-4 h-4" /> เริ่มสอบ
                </Link>
              </div>
            </div>

            {/* TGAT2 */}
            <div className="saas-card saas-card-hover flex flex-col group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary-500/10 rounded-xl text-secondary-500">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="heading-md text-white group-hover:text-secondary-500 transition-colors">TGAT2</h3>
                  <p className="text-xs text-slate-400">Logical & Critical Thinking</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 mb-6">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-300 font-bold">สถิติสูงสุด</span>
                  <span className="text-lg font-black text-secondary-500">{Math.round(getBestScore(tgat2History))}%</span>
                </div>
                {tgat2History.length > 0 && (
                  <div className="flex justify-end pr-1">
                    <Link href="/results/tgat2" className="text-[11px] text-secondary-400 hover:text-secondary-300 hover:underline flex items-center gap-1 font-semibold transition-all">
                      ดูผลสอบล่าสุด &rarr;
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <Link href="/tgat2/study" className="flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold text-xs transition-all">
                  <FileText className="w-4 h-4" /> ติวเนื้อหา
                </Link>
                <Link href="/tgat2" className="flex items-center justify-center gap-2 py-2 bg-secondary-500/10 hover:bg-secondary-500/20 border border-secondary-500/30 text-secondary-500 rounded-xl font-bold text-xs transition-all">
                  <Play className="w-4 h-4" /> เริ่มสอบ
                </Link>
              </div>
            </div>

            {/* TGAT3 */}
            <div className="saas-card saas-card-hover flex flex-col group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-warning-500/10 rounded-xl text-warning-500">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="heading-md text-white group-hover:text-warning-500 transition-colors">TGAT3</h3>
                  <p className="text-xs text-slate-400">Future Workforce</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 mb-6">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="text-xs text-slate-300 font-bold">สถิติสูงสุด</span>
                  <span className="text-lg font-black text-warning-500">{Math.round(getBestScore(tgat3History))}%</span>
                </div>
                {tgat3History.length > 0 && (
                  <div className="flex justify-end pr-1">
                    <Link href="/results/tgat3" className="text-[11px] text-warning-400 hover:text-warning-300 hover:underline flex items-center gap-1 font-semibold transition-all">
                      ดูผลสอบล่าสุด &rarr;
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <Link href="/tgat3/study" className="flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold text-xs transition-all">
                  <FileText className="w-4 h-4" /> ติวเนื้อหา
                </Link>
                <Link href="/tgat3" className="flex items-center justify-center gap-2 py-2 bg-warning-500/10 hover:bg-warning-500/20 border border-warning-500/30 text-warning-500 rounded-xl font-bold text-xs transition-all">
                  <Play className="w-4 h-4" /> เริ่มสอบ
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
