"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/examStore";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";
import { ArrowLeft, ArrowRight, Flag, CheckCircle2, Bookmark, Lightbulb, Zap, HelpCircle, Grid } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SafeHtml } from "@/components/SafeHtml";

export default function MockExamPage() {
  const router = useRouter();
  const {
    mockSession,
    startMockExam,
    setMockAnswer,
    toggleMockFlag,
    goToMockQuestion,
    setMockTimeRemaining,
    finishMockExam,
    resetMockExam,
    toggleBookmark,
    isBookmarked,
  } = useExamStore();

  const [mounted, setMounted] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (!mockSession || mockSession.isFinished) {
      const combined = [...TGAT1_QUESTIONS, ...TGAT2_QUESTIONS, ...TGAT3_QUESTIONS];
      startMockExam(combined);
    }
  }, [mockSession, startMockExam]);

  // Countdown timer for mock exam (3 hours = 10,800 seconds)
  useEffect(() => {
    if (!mounted || !mockSession || mockSession.isFinished) return;

    const timer = setInterval(() => {
      if (mockSession.timeRemaining <= 0) {
        clearInterval(timer);
        finishMockExam();
        router.push("/results/mock");
      } else {
        setMockTimeRemaining(mockSession.timeRemaining - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, mockSession, setMockTimeRemaining, finishMockExam, router]);

  if (!mounted || !mockSession) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center text-neon-blue font-bold font-mono">
        Loading Mock Exam Engine...
      </div>
    );
  }

  const q = mockSession.questions[mockSession.currentQuestionIndex];
  const total = mockSession.questions.length;
  const isQuestionFlagged = mockSession.flags[mockSession.currentQuestionIndex] === true;
  const isQuestionBookmarked = isBookmarked(q.id);
  const selectedAnswer = mockSession.answers[mockSession.currentQuestionIndex];

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleFinish = () => {
    if (window.confirm("คุณต้องการส่งข้อสอบเพื่อวิเคราะห์คะแนนทันทีหรือไม่?")) {
      finishMockExam();
      router.push("/results/mock");
    }
  };

  // Determine current section label
  let sectionLabel = "TGAT1: English Communication";
  if (q.id.startsWith("T2-")) {
    sectionLabel = "TGAT2: Logical & Critical Thinking";
  } else if (q.id.startsWith("T3-")) {
    sectionLabel = "TGAT3: Future Workforce Competencies";
  }

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 relative overflow-hidden font-sans pb-28">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        
        {/* Top Header Panel */}
        <div className="flex items-center justify-between p-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="heading-md text-white font-heading leading-tight">
                TGAT Full 200 Questions Mock Exam
              </h2>
              <span className="text-small text-indigo-400 font-medium bg-neon-purple/10 px-2 py-0.5 rounded border border-neon-purple/20">
                Official Time Simulation
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-mono font-bold text-sm">
              ⏳ {formatTime(mockSession.timeRemaining)}
            </div>
            
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="text-xs px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 transition-all"
            >
              Grid Navigator
            </button>
          </div>
        </div>

        {/* Dynamic Grid navigator collapse panel */}
        <AnimatePresence>
          {showGrid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2.5 mb-4">
                <h4 className="heading-md text-white flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-neon-blue" /> Navigator Map (200 Questions)
                </h4>
                <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-neon-purple rounded" /> Answered</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded" /> Flagged</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-white/10 rounded" /> Unanswered</span>
                </div>
              </div>

              <div className="grid grid-cols-10 md:grid-cols-20 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {mockSession.questions.map((_, index) => {
                  const hasAnswer = mockSession.answers[index] !== undefined;
                  const isFlagged = mockSession.flags[index] === true;
                  const isCurrent = mockSession.currentQuestionIndex === index;

                  let border = "border-white/5 bg-white/5 text-slate-400";
                  if (isCurrent) border = "border-neon-blue bg-neon-blue/20 text-white shadow-[0_0_8px_rgba(6,182,212,0.3)]";
                  else if (isFlagged) border = "border-red-500 bg-red-500/20 text-red-300";
                  else if (hasAnswer) border = "border-neon-purple bg-neon-purple/20 text-neon-purple";

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        goToMockQuestion(index);
                        setShowGrid(false);
                      }}
                      className={`py-1.5 rounded-lg border text-[10px] font-black font-mono transition-all hover:scale-105 active:scale-95 ${border}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Panel */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl relative">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <span className="text-xs font-bold text-neon-purple bg-neon-purple/10 border border-neon-purple/20 px-3 py-1 rounded-lg">
              {sectionLabel} (ข้อ {mockSession.currentQuestionIndex + 1} / {total})
            </span>
            <span className="text-xs text-slate-400 font-medium">Difficulty: {q.difficulty}</span>
          </div>

          {q.passage && (
            <div className="exam-passage">
              <SafeHtml content={q.passage} />
            </div>
          )}

          <h3 className="heading-md text-white mb-6">
            <SafeHtml content={q.text} />
          </h3>

          <div className="space-y-3.5">
            {q.options.map((opt, i) => {
              const isSelected = selectedAnswer === i;
              
              let style = "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-slate-500";
              if (isSelected) {
                style = "bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]";
              }

              return (
                <button
                  key={i}
                  onClick={() => setMockAnswer(mockSession.currentQuestionIndex, i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${style}`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs border ${
                    isSelected ? "border-neon-purple text-neon-purple" : "border-slate-500 text-slate-400"
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-xs md:text-sm leading-relaxed mt-0.5">
                    <SafeHtml content={opt} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-white/10 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => toggleMockFlag(mockSession.currentQuestionIndex)}
              className={`p-2.5 rounded-xl border transition-all ${
                isQuestionFlagged
                  ? "bg-red-500/20 border-red-500 text-red-400"
                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
              }`}
              title="Flag question"
            >
              <Flag className="w-5 h-5" />
            </button>

            <button
              onClick={() => toggleBookmark(q.id)}
              className={`p-2.5 rounded-xl border transition-all ${
                isQuestionBookmarked
                  ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
              }`}
              title="Bookmark question"
            >
              <Bookmark className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => goToMockQuestion(mockSession.currentQuestionIndex - 1)}
              disabled={mockSession.currentQuestionIndex === 0}
              className="p-2.5 bg-white/5 border border-white/5 text-slate-300 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="font-mono text-sm text-slate-400 font-bold px-1 select-none">
              {mockSession.currentQuestionIndex + 1} / {total}
            </span>

            {mockSession.currentQuestionIndex === total - 1 ? (
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-green-500/20 active:scale-95 transition-all text-sm"
              >
                <CheckCircle2 className="w-5 h-5" /> Submit Mock Exam
              </button>
            ) : (
              <button
                onClick={() => goToMockQuestion(mockSession.currentQuestionIndex + 1)}
                className="p-2.5 bg-white/5 border border-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-all"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
