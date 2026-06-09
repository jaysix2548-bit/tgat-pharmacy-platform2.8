"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, BarChart2, Clock, Target, TrendingUp } from "lucide-react";
import { getAccuracyByTopic, getAccuracyByDifficulty } from "@/lib/scoring";
import { getProgressTrend, getReadinessLevel } from "@/lib/analytics";
import ScoreChart from "@/components/results/ScoreChart";
import ProgressGraph from "@/components/results/ProgressGraph";
import TopicBreakdown from "@/components/results/TopicBreakdown";
import QuestionReviewList from "@/components/results/QuestionReviewList";
import { TGAT1_QUESTIONS } from "@/data/tgat1";

export default function TGAT1ResultPage() {
  const router = useRouter();
  const { questions, answers, score, timeRemaining, examMode, perQuestionTime, getHistory } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Determine active data or fallback to the latest persistent result
  const history = getHistory("tgat1");
  const latestResult = history.length > 0 ? history[history.length - 1] : null;

  let displayQuestions = questions;
  let displayAnswers = answers;
  let displayScore = score;
  let displayExamMode = examMode;
  let displayPerQuestionTime = perQuestionTime;
  let displayTimeRemaining = timeRemaining;

  if (displayQuestions.length === 0 && latestResult) {
    if (latestResult.questionIds) {
      displayQuestions = latestResult.questionIds
        .map(id => TGAT1_QUESTIONS.find(q => q.id === id))
        .filter(Boolean) as typeof TGAT1_QUESTIONS;
    } else {
      displayQuestions = TGAT1_QUESTIONS.slice(0, latestResult.total);
    }
    displayAnswers = latestResult.answers;
    displayScore = latestResult.score;
    displayExamMode = latestResult.mode;
    displayPerQuestionTime = latestResult.perQuestionTime;
    displayTimeRemaining = latestResult.mode === 'exam' ? 3600 - latestResult.timeSpent : 0;
  }

  if (displayQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center text-white">
        <p className="text-xl mb-4">No recent exam data found.</p>
        <Link href="/tgat1" className="text-neon-blue underline">Go take the exam</Link>
      </div>
    );
  }

  const topicScores = getAccuracyByTopic(displayQuestions, displayAnswers);
  const diffScores = getAccuracyByDifficulty(displayQuestions, displayAnswers);
  const progress = getProgressTrend(history);
  
  const percentage = Math.round((displayScore / displayQuestions.length) * 100);
  const readiness = getReadinessLevel(percentage);

  // Time Analysis
  const totalTimeSpent = displayQuestions.length > 0 ? (displayExamMode === 'exam' ? 3600 - displayTimeRemaining : Object.values(displayPerQuestionTime).reduce((a,b)=>a+b, 0)) : 0;
  const timeMins = Math.floor(totalTimeSpent / 60);
  const timeSecs = totalTimeSpent % 60;
  const avgTimePerQ = Math.round(totalTimeSpent / displayQuestions.length);

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 font-sans pb-28">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-neon-blue/5 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        
        {/* Header Action */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> กลับสู่ Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/my-mistakes" className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all">
              ดูข้อที่ผิดพลาด
            </Link>
            <button onClick={() => router.push('/tgat1')} className="px-4 py-2 bg-neon-blue text-black font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-cyan-400 transition-all">
              <RefreshCw className="w-4 h-4" /> ทำใหม่อีกครั้ง
            </button>
          </div>
        </div>

        {/* Top Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <ScoreChart score={displayScore} total={displayQuestions.length} label="คะแนน TGAT1" />
          </div>
          
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/10 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Target className="w-5 h-5" /> ระดับความพร้อม
              </div>
              <div className={`text-3xl font-black ${percentage >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                {readiness}
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/10 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Clock className="w-5 h-5" /> เวลาที่ใช้ไป
              </div>
              <div className="text-3xl font-black text-white">
                {timeMins}m {timeSecs}s
              </div>
              <div className="text-xs text-slate-500 mt-1">
                เฉลี่ย {avgTimePerQ} วินาที / ข้อ
              </div>
            </div>
            
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/10 flex flex-col justify-center col-span-2">
              <div className="flex items-center gap-2 text-slate-400 mb-4">
                <TrendingUp className="w-5 h-5" /> พัฒนาการ (TGAT1)
              </div>
              <ProgressGraph history={progress} />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Topic */}
          <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-white/10 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-neon-blue" /> วิเคราะห์จุดอ่อนตามหัวข้อ
            </h3>
            <TopicBreakdown topicScores={topicScores} />
          </div>

          {/* By Difficulty */}
          <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-white/10 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-400" /> ความแม่นยำตามระดับความยาก
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {diffScores.map(ds => (
                <div key={ds.difficulty} className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                  <div className="text-sm text-slate-400 font-bold mb-1">{ds.difficulty}</div>
                  <div className="text-2xl font-black text-white mb-1">{ds.percentage}%</div>
                  <div className="text-xs text-slate-500">{ds.correct} / {ds.total} ข้อ</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Question Review */}
        <QuestionReviewList 
          questions={displayQuestions} 
          answers={displayAnswers} 
          perQuestionTime={displayPerQuestionTime} 
        />
      </div>
    </main>
  );
}
