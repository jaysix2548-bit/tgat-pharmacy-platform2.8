"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { 
  ArrowLeft, 
  BookOpen, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  X, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Zap, 
  Award 
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { MistakeEntry, Question } from "@/types/exam";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";
import { SafeHtml } from "@/components/SafeHtml";

export default function MyMistakesPage() {
  const { getMistakes, clearMistake } = useExamStore();
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filterExam, setFilterExam] = useState<string>("all");

  // Interactive States
  const [expandedMistakeId, setExpandedMistakeId] = useState<string | null>(null);
  
  // Retake State
  const [retakeQuestion, setRetakeQuestion] = useState<Question | null>(null);
  const [retakeSelectedAnswer, setRetakeSelectedAnswer] = useState<number | null>(null);
  const [retakeIsSubmitted, setRetakeIsSubmitted] = useState<boolean>(false);
  const [retakeIsCorrect, setRetakeIsCorrect] = useState<boolean>(false);

  // Quiz Mode State
  const [quizModeActive, setQuizModeActive] = useState<boolean>(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [quizScores, setQuizScores] = useState<number>(0);
  const [quizClearedCount, setQuizClearedCount] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  useEffect(() => {
    setMistakes(getMistakes());
    setMounted(true);
  }, [getMistakes]);

  if (!mounted) return null;

  const filteredMistakes = filterExam === "all" 
    ? mistakes 
    : mistakes.filter(m => m.examId === filterExam);

  // Helper to find question details
  const getQuestionDetails = (id: string, examId: string) => {
    let qList: Question[] = [];
    if (examId === "tgat1") qList = TGAT1_QUESTIONS;
    if (examId === "tgat2") qList = TGAT2_QUESTIONS;
    if (examId === "tgat3") qList = TGAT3_QUESTIONS;

    return qList.find(q => q.id === id);
  };

  const handleOpenRetake = (q: Question) => {
    setRetakeQuestion(q);
    setRetakeSelectedAnswer(null);
    setRetakeIsSubmitted(false);
    setRetakeIsCorrect(false);
  };

  const startQuizMode = () => {
    const activeQs = filteredMistakes
      .map(m => getQuestionDetails(m.questionId, m.examId))
      .filter((q): q is Question => q !== undefined);

    if (activeQs.length === 0) return;

    // Shuffle
    const shuffled = [...activeQs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setQuizQuestions(shuffled);
    setCurrentQuizIndex(0);
    setQuizAnswers({});
    setQuizSubmitted({});
    setQuizScores(0);
    setQuizClearedCount(0);
    setQuizFinished(false);
    setQuizModeActive(true);
  };

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 font-sans pb-28">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-red-400" /> Mistake Notebook
              </h1>
              <p className="text-sm text-slate-400 mt-1">สมุดบันทึกข้อที่เคยทำผิด กลับมาทบทวนเพื่อไม่ให้พลาดอีก</p>
            </div>
          </div>

          <select
            value={filterExam}
            onChange={(e) => setFilterExam(e.target.value)}
            className="bg-slate-950/80 border border-white/10 text-white p-2.5 rounded-xl text-sm outline-none focus:border-red-400"
          >
            <option value="all">ทุกวิชา (All Exams)</option>
            <option value="tgat1">TGAT1 (English)</option>
            <option value="tgat2">TGAT2 (Logical)</option>
            <option value="tgat3">TGAT3 (Competencies)</option>
          </select>
        </div>

        {/* List of Mistakes */}
        {filteredMistakes.length === 0 ? (
          <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl">
            <AlertCircle className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-slate-300">เก่งมาก! ยังไม่มีข้อผิดพลาด</h3>
            <p className="text-slate-500 mt-2">เมื่อคุณทำข้อสอบผิด ระบบจะบันทึกข้อเหล่านั้นมาไว้ที่นี่อัตโนมัติ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map((mistake, i) => {
              const q = getQuestionDetails(mistake.questionId, mistake.examId);
              if (!q) return null;

              const isExpanded = expandedMistakeId === mistake.questionId;

              return (
                <motion.div
                  key={mistake.questionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 md:p-6 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl hover:border-white/20 transition-all flex flex-col gap-4"
                >
                  <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-lg">
                          {mistake.questionId}
                        </span>
                        <span className="text-xs font-bold bg-white/10 text-slate-300 px-2.5 py-1 rounded-lg uppercase">
                          {mistake.examId}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {q.topic}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          q.difficulty === 'Elite' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                          q.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          q.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          'bg-green-500/20 text-green-400 border-green-500/30'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>

                      <p className="text-slate-200 line-clamp-2 text-sm leading-relaxed">
                        {q.text.replace(/<[^>]+>/g, '')}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                        <span>ผิดไปแล้ว: <strong className="text-red-400">{mistake.attempts}</strong> ครั้ง</span>
                        <span>•</span>
                        <span>อัพเดตล่าสุด: {new Date(mistake.date).toLocaleDateString("th-TH")}</span>
                      </div>
                    </div>

                    <div className="flex w-full md:w-auto gap-2">
                      <button 
                        onClick={() => setExpandedMistakeId(isExpanded ? null : mistake.questionId)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          isExpanded 
                            ? "bg-white/10 border-white/20 text-white" 
                            : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            <EyeOff className="w-4 h-4" /> ซ่อนเฉลย
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" /> ดูเฉลย
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => handleOpenRetake(q)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                      >
                        <RefreshCw className="w-4 h-4" /> ลองทำใหม่
                      </button>
                    </div>
                  </div>

                  {/* Accordion Expansion */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="w-full mt-4 border-t border-white/5 pt-4 space-y-4 overflow-hidden"
                      >
                        {q.passage && (
                          <div className="exam-passage">
                            <SafeHtml content={q.passage} />
                          </div>
                        )}
                        
                        <div className="text-sm font-semibold text-white leading-relaxed">
                          <SafeHtml content={q.text} />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((option, optIdx) => {
                            const isCorrect = q.answer === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-colors ${
                                  isCorrect
                                    ? "bg-green-500/10 border-green-500/40 text-green-300"
                                    : "bg-slate-950/40 border-white/5 text-slate-400"
                                }`}
                              >
                                <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border-2 ${
                                  isCorrect ? "border-green-400 text-green-400 bg-green-500/10" : "border-slate-600 text-slate-500"
                                }`}>
                                  {optIdx + 1}
                                </div>
                                <span className="flex-1 leading-relaxed">
                                  <SafeHtml content={option} />
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Text */}
                        <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 space-y-3">
                          <div>
                            <h4 className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                              <BookOpen className="w-3.5 h-3.5" /> เฉลยและคำอธิบาย
                            </h4>
                            <p className="text-slate-300 text-xs leading-relaxed">
                              <SafeHtml content={q.correctExplanation} />
                            </p>
                          </div>
                          
                          {q.wrongExplanation && (
                            <div className="border-t border-white/5 pt-2">
                              <h4 className="text-red-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                                <AlertCircle className="w-3.5 h-3.5" /> วิเคราะห์ตัวเลือกที่ผิด
                              </h4>
                              <p className="text-slate-300 text-xs leading-relaxed">
                                <SafeHtml content={q.wrongExplanation} />
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 pt-3">
                            <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/10">
                              <h4 className="text-purple-400 font-bold text-[11px] mb-1 flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5" /> แนวคิด (Mindset)
                              </h4>
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                <SafeHtml content={q.mindset} />
                              </p>
                            </div>
                            
                            <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/10">
                              <h4 className="text-yellow-400 font-bold text-[11px] mb-1 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5" /> เทคนิคทำเร็ว (Speed Hack)
                              </h4>
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                <SafeHtml content={q.speedHack} />
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredMistakes.length > 0 && (
          <div className="flex justify-center mt-8">
            <button 
              onClick={startQuizMode}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5 animate-spin-slow" /> ทบทวนข้อผิดทั้งหมด (Quiz Mode)
            </button>
          </div>
        )}

      </div>

      {/* Retake Question Overlay Modal */}
      <AnimatePresence>
        {retakeQuestion && (
          <div className="fixed inset-0 z-50 bg-[#02050a]/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setRetakeQuestion(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">
                  ลองทำใหม่: {retakeQuestion.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-3">{retakeQuestion.partTitle}</h3>
              </div>

              {retakeQuestion.passage && (
                <div className="exam-passage max-h-[180px] overflow-y-auto">
                  <SafeHtml content={retakeQuestion.passage} />
                </div>
              )}

              <div className="text-base md:text-lg font-medium text-white leading-relaxed">
                <SafeHtml content={retakeQuestion.text} />
              </div>

              <div className="space-y-3">
                {retakeQuestion.options.map((option, i) => {
                  const isSelected = retakeSelectedAnswer === i;
                  const isCorrect = retakeIsSubmitted && retakeQuestion.answer === i;
                  const isWrongSelected = retakeIsSubmitted && isSelected && !isCorrect;

                  let optionStyle = "bg-slate-950/40 border-white/5 text-slate-300 hover:bg-white/5";
                  if (isSelected && !retakeIsSubmitted) {
                    optionStyle = "bg-cyan-500/20 border-cyan-500 text-cyan-300";
                  } else if (retakeIsSubmitted) {
                    if (isCorrect) optionStyle = "bg-green-500/20 border-green-500 text-green-300";
                    else if (isWrongSelected) optionStyle = "bg-red-500/20 border-red-500 text-red-300 opacity-80";
                    else optionStyle = "bg-slate-950/20 border-white/5 text-slate-500 opacity-40";
                  }

                  return (
                    <button
                      key={i}
                      disabled={retakeIsSubmitted}
                      onClick={() => setRetakeSelectedAnswer(i)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 text-sm ${optionStyle}`}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs border-2 ${
                        isSelected && !retakeIsSubmitted ? "border-cyan-400 text-cyan-400" :
                        isCorrect ? "border-green-400 text-green-400 bg-green-500/10" :
                        isWrongSelected ? "border-red-400 text-red-400" :
                        "border-slate-500 text-slate-400"
                      }`}>
                        {i + 1}
                      </div>
                      <span className="flex-1 leading-relaxed">
                        <SafeHtml content={option} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Action Footer */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                {!retakeIsSubmitted ? (
                  <>
                    <button
                      onClick={() => setRetakeQuestion(null)}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-all"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => {
                        if (retakeSelectedAnswer === null) return;
                        setRetakeIsSubmitted(true);
                        const correct = retakeSelectedAnswer === retakeQuestion.answer;
                        setRetakeIsCorrect(correct);
                      }}
                      disabled={retakeSelectedAnswer === null}
                      className="px-6 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/10 transition-all"
                    >
                      ตรวจคำตอบ
                    </button>
                  </>
                ) : (
                  <div className="w-full space-y-4">
                    {retakeIsCorrect ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                          <div>
                            <h5 className="text-green-400 font-bold text-sm">ยอดเยี่ยม! คุณตอบถูกแล้ว</h5>
                            <p className="text-slate-400 text-xs mt-0.5">ลบข้อนี้ออกจากสมุดจดผิดเพื่อประเมินจุดอ่อนให้หมดไป</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            clearMistake(retakeQuestion.id);
                            setMistakes(getMistakes());
                            setRetakeQuestion(null);
                          }}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.3)] flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> ลบออกจากสมุดจดผิด
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                          <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                          <div>
                            <h5 className="text-red-400 font-bold text-sm">ยังไม่ถูกต้องนะ!</h5>
                            <p className="text-slate-400 text-xs mt-0.5">ลองศึกษาคำอธิบายเพื่อแก้สมอง หรือทำใหม่อีกครั้ง</p>
                          </div>
                        </div>

                        {/* Explanation */}
                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 text-xs text-slate-300 leading-relaxed max-h-[160px] overflow-y-auto space-y-2">
                          <p className="font-bold text-cyan-400 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> เฉลยและแนวทาง:</p>
                          <SafeHtml content={retakeQuestion.correctExplanation} />
                          {retakeQuestion.mindset && (
                            <p className="text-purple-400 mt-2">💡 Mindset: <SafeHtml content={retakeQuestion.mindset} /></p>
                          )}
                          {retakeQuestion.speedHack && (
                            <p className="text-yellow-400">⚡ Speed Hack: <SafeHtml content={retakeQuestion.speedHack} /></p>
                          )}
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setRetakeSelectedAnswer(null);
                              setRetakeIsSubmitted(false);
                              setRetakeIsCorrect(false);
                            }}
                            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-slate-300 transition-all flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-4 h-4" /> ลองใหม่อีกรอบ
                          </button>
                          <button
                            onClick={() => setRetakeQuestion(null)}
                            className="px-5 py-2.5 bg-slate-850 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
                          >
                            ปิดหน้าต่าง
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-Screen Quiz Mode Overlay */}
      <AnimatePresence>
        {quizModeActive && quizQuestions.length > 0 && !quizFinished && (
          <div className="fixed inset-0 z-50 bg-[#050b14] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-950/80 p-4 backdrop-blur-xl flex items-center justify-between sticky top-0">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-red-500/20">
                  QUIZ MODE
                </span>
                <h2 className="text-sm md:text-base font-bold text-slate-300">
                  ทบทวนข้อผิดพลาด (ข้อที่ {currentQuizIndex + 1} จาก {quizQuestions.length})
                </h2>
              </div>
              <button
                onClick={() => {
                  setQuizModeActive(false);
                  setMistakes(getMistakes());
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                ออกจาก Quiz Mode
              </button>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-white/5 w-full">
              <div 
                className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>

            {/* Main Quiz Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
              <div className="max-w-3xl w-full space-y-6 pb-20">
                {(() => {
                  const q = quizQuestions[currentQuizIndex];
                  const selectedAnswer = quizAnswers[q.id];
                  const isSubmitted = quizSubmitted[q.id] === true;
                  const isCorrect = selectedAnswer === q.answer;

                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6"
                    >
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <span className="text-xs font-bold bg-white/5 text-slate-400 border border-white/10 px-2.5 py-1 rounded-lg">
                          {q.id} • {(mistakes.find(m => m.questionId === q.id)?.examId || "tgat").toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          เวลาแนะนำ: {q.suggestedTime}
                        </span>
                      </div>

                      {q.passage && (
                        <div className="exam-passage max-h-[200px] overflow-y-auto">
                          <SafeHtml content={q.passage} />
                        </div>
                      )}

                      <div className="text-lg md:text-xl font-medium text-white leading-relaxed">
                        <SafeHtml content={q.text} />
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        {q.options.map((option, optIdx) => {
                          const isOptSelected = selectedAnswer === optIdx;
                          const isOptCorrect = isSubmitted && q.answer === optIdx;
                          const isOptWrongSelected = isSubmitted && isOptSelected && !isOptCorrect;

                          let style = "bg-slate-950/40 border-white/5 text-slate-300 hover:bg-white/5";
                          if (isOptSelected && !isSubmitted) {
                            style = "bg-cyan-500/20 border-cyan-500 text-cyan-300";
                          } else if (isSubmitted) {
                            if (isOptCorrect) style = "bg-green-500/20 border-green-500 text-green-300";
                            else if (isOptWrongSelected) style = "bg-red-500/20 border-red-500 text-red-300 opacity-80";
                            else style = "bg-slate-950/20 border-white/5 text-slate-500 opacity-40";
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={isSubmitted}
                              onClick={() => setQuizAnswers({ ...quizAnswers, [q.id]: optIdx })}
                              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 text-sm ${style}`}
                            >
                              <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full font-bold text-xs border-2 ${
                                isOptSelected && !isSubmitted ? "border-cyan-400 text-cyan-400" :
                                isOptCorrect ? "border-green-400 text-green-400 bg-green-500/10" :
                                isOptWrongSelected ? "border-red-400 text-red-400" :
                                "border-slate-500 text-slate-400"
                              }`}>
                                {optIdx + 1}
                              </div>
                              <span className="flex-1 leading-relaxed font-sans">
                                <SafeHtml content={option} />
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Instant feedback card */}
                      {isSubmitted && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                            isCorrect ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}>
                            {isCorrect ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" /> : <XCircle className="w-6 h-6 flex-shrink-0" />}
                            <div>
                              <h4 className="font-bold text-sm">{isCorrect ? "ยอดเยี่ยม! ตอบถูกต้อง" : "ยังไม่ถูกต้อง!"}</h4>
                              <p className="text-slate-400 text-xs mt-0.5">
                                {isCorrect ? "ระบบได้สัญลักษณ์ลบข้อนี้จากประวัติเพื่อเคลียร์จุดบอดแล้ว" : "ศึกษาข้อวิเคราะห์และคำเฉลยอย่างละเอียดด้านล่าง"}
                              </p>
                            </div>
                          </div>

                          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 text-xs md:text-sm text-slate-300 leading-relaxed space-y-3">
                            <div>
                              <h5 className="text-cyan-400 font-bold flex items-center gap-1.5 mb-1">
                                <BookOpen className="w-4 h-4" /> เฉลยและวิเคราะห์:
                              </h5>
                              <SafeHtml content={q.correctExplanation} />
                            </div>
                            {q.wrongExplanation && (
                              <div className="border-t border-white/5 pt-2">
                                <h5 className="text-red-400 font-bold flex items-center gap-1.5 mb-1">
                                  <XCircle className="w-4 h-4" /> วิเคราะห์จุดหลอก:
                                </h5>
                                <SafeHtml content={q.wrongExplanation} />
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 pt-3">
                              <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/10">
                                <h5 className="text-purple-400 font-bold text-[11px] mb-1 flex items-center gap-1">💡 Mindset เภสัช/สุขภาพ:</h5>
                                <SafeHtml content={q.mindset} />
                              </div>
                              <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/10">
                                <h5 className="text-yellow-400 font-bold text-[11px] mb-1 flex items-center gap-1">⚡ Speed Hack ทำเร็ว:</h5>
                                <SafeHtml content={q.speedHack} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex justify-between items-center pt-4 border-t border-white/5">
                        <button
                          disabled={currentQuizIndex === 0}
                          onClick={() => setCurrentQuizIndex(currentQuizIndex - 1)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl text-xs font-bold text-slate-300 transition-all border border-white/5"
                        >
                          ย้อนกลับ
                        </button>

                        {!isSubmitted ? (
                          <button
                            disabled={selectedAnswer === undefined}
                            onClick={() => {
                              setQuizSubmitted({ ...quizSubmitted, [q.id]: true });
                              if (isCorrect) {
                                setQuizScores(quizScores + 1);
                                setQuizClearedCount(quizClearedCount + 1);
                                clearMistake(q.id);
                              }
                            }}
                            className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all"
                          >
                            ตรวจคำตอบ
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (currentQuizIndex < quizQuestions.length - 1) {
                                setCurrentQuizIndex(currentQuizIndex + 1);
                              } else {
                                setQuizFinished(true);
                              }
                            }}
                            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl text-sm font-bold transition-all"
                          >
                            {currentQuizIndex === quizQuestions.length - 1 ? "ดูผลลัพธ์ทบทวน" : "ข้อถัดไป"}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Quiz Finished Screen */}
      <AnimatePresence>
        {quizModeActive && quizFinished && (
          <div className="fixed inset-0 z-50 bg-[#050b14]/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative"
            >
              <div className="w-20 h-20 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                  ทบทวนเสร็จสิ้น! 🎉
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-sans">
                  ยอดเยี่ยมมากครับ คุณก้าวข้ามผ่านจุดอ่อนที่เคยทำพลาดได้สำเร็จ!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl">
                  <span className="block text-xs text-slate-500 mb-1">ตอบถูกรอบใหม่</span>
                  <strong className="text-2xl font-extrabold text-white">{quizScores} / {quizQuestions.length}</strong>
                </div>
                <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl">
                  <span className="block text-xs text-slate-500 mb-1">เคลียร์ออกจากลิสต์</span>
                  <strong className="text-2xl font-extrabold text-green-400">-{quizClearedCount} ข้อ ✅</strong>
                </div>
              </div>

              <button
                onClick={() => {
                  setQuizModeActive(false);
                  setQuizFinished(false);
                  setMistakes(getMistakes());
                }}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                กลับสู่สมุดจดจุดผิด
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
