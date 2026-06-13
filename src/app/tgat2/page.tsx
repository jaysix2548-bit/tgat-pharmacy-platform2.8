"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/examStore";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { ArrowLeft, ArrowRight, Flag, CheckCircle2, Bookmark, Lightbulb, Zap, HelpCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import QuestionNavigator from "@/components/exam/QuestionNavigator";
import { SafeHtml } from "@/components/SafeHtml";

export default function TGAT2ExamPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);

  const {
    examMode,
    questions,
    currentQuestionIndex,
    answers,
    flags,
    timeRemaining,
    isFinished,
    score,
    setQuestions,
    setAnswer,
    nextQuestion,
    prevQuestion,
    toggleFlag,
    toggleBookmark,
    isBookmarked,
    finishExam,
    setTimeRemaining,
  } = useExamStore();

  // Load questions
  useEffect(() => {
    const currentStore = useExamStore.getState();
    const hasActiveSession = currentStore.examId === "tgat2" && 
                             currentStore.questions.length > 0 && 
                             !currentStore.isFinished;
    if (!hasActiveSession) {
      setQuestions("tgat2", TGAT2_QUESTIONS, examMode);
    }
    setMounted(true);
  }, [setQuestions, examMode]);

  // Timer Countdown Effect
  useEffect(() => {
    if (!mounted || isFinished) return;

    const timer = setInterval(() => {
      if (timeRemaining <= 0) {
        finishExam();
        router.push("/results/tgat2");
      } else {
        setTimeRemaining(timeRemaining - 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, timeRemaining, isFinished, examMode, finishExam, setTimeRemaining, router]);

  if (!mounted || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center text-neon-blue font-bold font-mono">
        Loading Exam Engine...
      </div>
    );
  }

  const q = questions[currentQuestionIndex];
  const total = questions.length;
  const isQuestionFlagged = flags[currentQuestionIndex] === true;
  const isQuestionBookmarked = isBookmarked(q.id);
  const selectedAnswer = answers[currentQuestionIndex];

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === undefined || secs === null) return "00:00";
    const m = Math.max(0, Math.floor(secs / 60));
    const s = Math.max(0, secs % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleFinish = () => {
    finishExam();
    router.push("/results/tgat2");
  };

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 relative overflow-hidden font-sans pb-28">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Top Header Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white leading-tight">
                TGAT2 : การคิดอย่างมีเหตุผล (Critical & Logical Thinking)
              </h2>
              <span className="text-[10px] text-blue-400 font-medium bg-neon-blue/10 px-2 py-0.5 rounded border border-neon-blue/20">
                {examMode === "exam" ? "Real Exam Sim" : "Practice Mode"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-mono font-bold text-sm">
              ⏳ {formatTime(timeRemaining)}
            </div>
            <button
              onClick={() => setShowNavigator(!showNavigator)}
              className="text-xs px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/5 transition-all"
            >
              Grid Navigator
            </button>
          </div>
        </div>

        {/* Navigator Drawer */}
        <AnimatePresence>
          {showNavigator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <QuestionNavigator onSelectQuestion={() => setShowNavigator(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Question Panel */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl relative">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <span className="text-xs font-bold text-neon-blue bg-neon-blue/10 border border-neon-blue/20 px-3 py-1 rounded-lg">
              ข้อ {currentQuestionIndex + 1} จาก {total}
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
                style = "bg-neon-blue/20 border-neon-blue text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]";
              }

              return (
                <button
                  key={i}
                  onClick={() => setAnswer(currentQuestionIndex, i)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${style}`}
                >
                  <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs border ${
                    isSelected ? "border-neon-blue text-neon-blue" : "border-slate-500 text-slate-400"
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-sm md:text-base leading-relaxed mt-0.5">
                    <SafeHtml content={opt} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Immediate Explanation Panel */}
        {examMode === "practice" && selectedAnswer !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 md:p-8 rounded-3xl bg-slate-950/80 border border-white/10 shadow-xl space-y-5 text-sm"
          >
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              {selectedAnswer === q.answer ? (
                <span className="text-green-400 font-extrabold flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-xl border border-green-500/20 text-xs">
                  ✓ ตอบถูกต้อง!
                </span>
              ) : (
                <span className="text-red-400 font-extrabold flex items-center gap-1 bg-red-500/10 px-3 py-1 rounded-xl border border-red-500/20 text-xs">
                  ✗ ยังไม่ถูกต้อง
                </span>
              )}
            </div>

            <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5">
              <h5 className="heading-md text-neon-blue mb-1">เฉลยและคำอธิบาย</h5>
              <p className="text-slate-300 leading-relaxed">
                <SafeHtml content={q.correctExplanation} />
              </p>
            </div>
            {selectedAnswer !== q.answer && (
              <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
                <h5 className="heading-md text-red-400 mb-1">วิเคราะห์ตัวเลือกที่คุณเลือก</h5>
                <p className="text-slate-300 leading-relaxed">
                  <SafeHtml content={q.wrongExplanation} />
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/10">
                <h5 className="heading-md text-purple-400 mb-1">แนวคิด (Mindset)</h5>
                <p className="text-slate-300 leading-relaxed">
                  <SafeHtml content={q.mindset} />
                </p>
              </div>
              <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/10">
                <h5 className="heading-md text-yellow-400 mb-1">เทคนิคทำเร็ว (Speed Hack)</h5>
                <p className="text-slate-300 leading-relaxed">
                  <SafeHtml content={q.speedHack} />
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-white/10 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => toggleFlag(currentQuestionIndex)}
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
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="p-2.5 bg-white/5 border border-white/5 text-slate-300 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <span className="font-mono text-sm text-slate-400 font-bold px-1 select-none">
              {currentQuestionIndex + 1} / {total}
            </span>

            {currentQuestionIndex === total - 1 ? (
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-green-500/20 active:scale-95 transition-all text-sm"
              >
                <CheckCircle2 className="w-5 h-5" /> Submit Exam
              </button>
            ) : (
              <button
                onClick={nextQuestion}
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
