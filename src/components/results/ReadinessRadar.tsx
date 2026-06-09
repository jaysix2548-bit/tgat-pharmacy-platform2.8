"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Target, Award, ShieldAlert, Sparkles } from "lucide-react";

export default function ReadinessRadar() {
  const { examHistory, mistakes } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-72 w-full flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading Radar Visualization Engine...
      </div>
    );
  }

  // Calculate readiness metrics from actual store data
  const tgat1History = examHistory.filter((h) => h.examId === "tgat1");
  const tgat2History = examHistory.filter((h) => h.examId === "tgat2");
  const tgat3History = examHistory.filter((h) => h.examId === "tgat3");

  const getAvgScore = (history: typeof examHistory) => {
    if (history.length === 0) return 40; // baseline default
    const totalPct = history.reduce((acc, h) => acc + (h.score / h.total) * 100, 0);
    return Math.round(totalPct / history.length);
  };

  const tgat1Avg = getAvgScore(tgat1History);
  const tgat2Avg = getAvgScore(tgat2History);
  const tgat3Avg = getAvgScore(tgat3History);

  // Speed factor: how many questions are answered within target limits (estimate ~60s/Q)
  let speedScore = 65; // default baseline
  if (examHistory.length > 0) {
    const totalQuestions = examHistory.reduce((acc, h) => acc + h.total, 0);
    const totalTime = examHistory.reduce((acc, h) => acc + h.timeSpent, 0);
    const avgTimePerQ = totalQuestions > 0 ? totalTime / totalQuestions : 60;
    
    // faster average speed maps to higher score
    if (avgTimePerQ < 40) speedScore = 95;
    else if (avgTimePerQ < 60) speedScore = 80;
    else if (avgTimePerQ < 80) speedScore = 65;
    else speedScore = 45;
  }

  // Syllabus coverage: based on how many mistakes are recorded relative to a total list of ~30 syllabus topics
  const mistakeCount = Object.keys(mistakes).length;
  const coverageScore = Math.max(30, 100 - mistakeCount * 4.5);

  const radarData = [
    { subject: "TGAT1 English", A: tgat1Avg, fullMark: 100 },
    { subject: "TGAT2 Logical", A: tgat2Avg, fullMark: 100 },
    { subject: "TGAT3 Workforce", A: tgat3Avg, fullMark: 100 },
    { subject: "Speed Mastery", A: speedScore, fullMark: 100 },
    { subject: "Syllabus Coverage", A: coverageScore, fullMark: 100 },
  ];

  // Calculate composite readiness score (0-100)
  const compositeReadiness = Math.round(
    (tgat1Avg * 0.3) + (tgat2Avg * 0.3) + (tgat3Avg * 0.2) + (speedScore * 0.1) + (coverageScore * 0.1)
  );

  // Predict real admission score based on composite (standard scale 0-300 points)
  // maps 0-100 scale to real scale (typically 120-280 in competitive scenarios)
  const predictedScore = Math.round(100 + (compositeReadiness / 100) * 190);

  // Generate target recommendation based on weakest dimension
  let suggestion = "แนะนำทบทวนพาร์ททักษะการทำงานอนาคต (TGAT3) เพื่อความเข้าใจกระบวนการทำงาน";
  const lowestScore = Math.min(tgat1Avg, tgat2Avg, tgat3Avg, speedScore, coverageScore);
  
  if (lowestScore === tgat1Avg) {
    suggestion = "คุณยังอ่อนพาร์ทภาษาอังกฤษ (TGAT1) เน้นสะสมคำศัพท์ใน Mistake Notebook และทำแบบฝึกอ่านสม่ำเสมอ";
  } else if (lowestScore === tgat2Avg) {
    suggestion = "พาร์ทการคิดอย่างมีตรรกะ (TGAT2) ยังปรับปรุงได้อีก แนะนำให้ใช้เทคนิค Speed Hack ในการช่วยหาข้อผิดพลาดตัวเลข";
  } else if (lowestScore === speedScore) {
    suggestion = "เวลาในการทำข้อสอบยังเฉลี่ยช้าเกินเป้าหมาย แนะนำให้ฝึกทำข้อสอบจับเวลาจริงใน Full Mock Mode เพื่อจับจังหวะการทำ";
  } else if (lowestScore === coverageScore) {
    suggestion = "คุณยังมีหัวข้อวิชาที่ข้ามไปค่อนข้างเยอะ แนะนำศึกษา Study Chapters และทบทวน Spaced Repetition ครบถ้วน";
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row gap-8 items-center">
      {/* Radar Chart (Left) */}
      <div className="w-full md:w-1/2 h-72 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "#475569", fontSize: 8 }}
            />
            <Radar
              name="Readiness"
              dataKey="A"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Analytics Score & Target Predictor (Right) */}
      <div className="w-full md:w-1/2 space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 text-xs font-bold">
            <Target className="w-4 h-4" /> Exam Readiness Analysis
          </div>
          <h3 className="text-2xl font-black text-white leading-tight">
            ประเมินโอกาสยื่นติดวิชาชีพสุขภาพ
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            วิเคราะห์เชิงลึกรวมสถิติความเร็ว ความกว้างเนื้อหา และความแม่นยำของคุณ
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-neon-blue/5 blur-[30px] rounded-full" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Readiness Score</span>
            <div className="text-3xl font-black text-neon-blue mt-1 font-mono">
              {compositeReadiness}%
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-neon-blue h-full rounded-full" 
                style={{ width: `${compositeReadiness}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-neon-purple/5 blur-[30px] rounded-full" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Predicted TGAT</span>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple mt-1 font-mono">
              {predictedScore} <span className="text-xs text-slate-500 font-normal">/ 300</span>
            </div>
            <span className="text-[9px] font-bold text-green-400 flex items-center gap-0.5 mt-2 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20 w-fit">
              <Award className="w-3 h-3" /> ยอดเยี่ยม ระดับหัวตาราง
            </span>
          </div>
        </div>

        {/* Dynamic Warning/Recommendation Banner */}
        <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl flex items-start gap-3.5 shadow-inner">
          <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl mt-0.5 flex-shrink-0 animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-extrabold text-white text-xs mb-1">คำแนะนำการอัปเดตคะแนนจาก AI:</h5>
            <p className="text-slate-300 text-xs leading-relaxed">
              {suggestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
