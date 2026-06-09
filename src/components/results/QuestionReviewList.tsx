"use client";

import React, { useState } from "react";
import { Question } from "@/types/exam";
import { CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, Clock, Zap, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SafeHtml } from "@/components/SafeHtml";

interface QuestionReviewListProps {
  questions: Question[];
  answers: Record<number, number>;
  perQuestionTime?: Record<number, number>;
}

export default function QuestionReviewList({
  questions,
  answers,
  perQuestionTime = {},
}: QuestionReviewListProps) {
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect">("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getQuestionStatus = (q: Question, idx: number) => {
    const userAnswer = answers[idx];
    if (userAnswer === undefined) return "unanswered";
    return userAnswer === q.answer ? "correct" : "incorrect";
  };

  const filteredItems = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => {
      const status = getQuestionStatus(q, idx);
      if (filter === "correct") return status === "correct";
      if (filter === "incorrect") return status === "incorrect";
      return true;
    });

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-neon-blue" /> ตรวจสอบเฉลยรายข้อ (Question Review)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ดูผลคำตอบทั้งหมดของคุณพร้อมการวิเคราะห์คำอธิบายเชิงลึก
          </p>
        </div>

        {/* Filters */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ทั้งหมด ({questions.length})
          </button>
          <button
            onClick={() => setFilter("correct")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "correct"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ตอบถูก ({questions.filter((q, i) => getQuestionStatus(q, i) === "correct").length})
          </button>
          <button
            onClick={() => setFilter("incorrect")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "incorrect"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ตอบผิด ({questions.filter((q, i) => getQuestionStatus(q, i) === "incorrect").length})
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          ไม่พบข้อสอบในเงื่อนไขการกรองนี้
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map(({ q, idx }) => {
            const status = getQuestionStatus(q, idx);
            const isExpanded = expandedIndex === idx;
            const selectedOpt = answers[idx];
            const timeSpent = perQuestionTime[idx];

            return (
              <div
                key={q.id}
                className={`border rounded-2xl transition-all duration-200 ${
                  isExpanded
                    ? "bg-slate-950/60 border-white/20"
                    : "bg-slate-950/20 border-white/5 hover:border-white/10"
                }`}
              >
                {/* Accordion Trigger Header */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full text-left p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Icon Indicator */}
                    <div className="flex-shrink-0">
                      {status === "correct" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : status === "incorrect" ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-400">
                          ข้อที่ {idx + 1}
                        </span>
                        <span className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {q.id}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold truncate max-w-[120px]">
                          {q.topic}
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-slate-300 truncate mt-1 max-w-[260px] sm:max-w-xl md:max-w-2xl font-medium">
                        {q.text.replace(/<[^>]+>/g, "")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {timeSpent !== undefined && (
                      <span className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <Clock className="w-3 h-3" /> {timeSpent}s
                      </span>
                    )}
                    {isExpanded ? (
                      <EyeOff className="w-4.5 h-4.5 text-slate-400" />
                    ) : (
                      <Eye className="w-4.5 h-4.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Collapsible Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 border-t border-white/5 pt-4 space-y-4 text-xs md:text-sm">
                        {q.passage && (
                          <div className="exam-passage max-h-[220px] overflow-y-auto p-4 bg-slate-900/40 rounded-xl border border-white/5 text-slate-300 leading-relaxed font-sans">
                            <SafeHtml content={q.passage} />
                          </div>
                        )}

                        <div className="text-slate-200 leading-relaxed font-bold">
                          <SafeHtml content={q.text} />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.answer === optIdx;
                            const isSelected = selectedOpt === optIdx;

                            let borderStyle = "border-white/5 bg-slate-900/20 text-slate-400";
                            if (isCorrect) {
                              borderStyle = "border-green-500/40 bg-green-500/10 text-green-300";
                            } else if (isSelected) {
                              borderStyle = "border-red-500/40 bg-red-500/10 text-red-300";
                            }

                            return (
                              <div
                                key={optIdx}
                                className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${borderStyle}`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                    isCorrect
                                      ? "border-green-400 text-green-400"
                                      : isSelected
                                      ? "border-red-400 text-red-400"
                                      : "border-slate-600 text-slate-500"
                                  }`}
                                >
                                  {optIdx + 1}
                                </div>
                                <span className="flex-1 leading-relaxed">
                                  <SafeHtml content={opt} />
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanations */}
                        <div className="bg-slate-950/60 border border-white/5 rounded-xl p-4 space-y-3.5">
                          <div>
                            <h4 className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 mb-1 select-none">
                              <CheckCircle2 className="w-3.5 h-3.5" /> เฉลยและคำอธิบาย
                            </h4>
                            <p className="text-slate-300 text-xs leading-relaxed font-medium">
                              <SafeHtml content={q.correctExplanation} />
                            </p>
                          </div>

                          {selectedOpt !== undefined && selectedOpt !== q.answer && q.wrongExplanation && (
                            <div className="border-t border-white/5 pt-3">
                              <h4 className="text-red-400 font-bold text-xs flex items-center gap-1.5 mb-1 select-none">
                                <XCircle className="w-3.5 h-3.5" /> วิเคราะห์ตัวเลือกของคุณ
                              </h4>
                              <p className="text-slate-300 text-xs leading-relaxed font-medium">
                                <SafeHtml content={q.wrongExplanation} />
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-white/5 pt-3.5">
                            <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/10">
                              <h4 className="text-purple-400 font-bold text-[11px] mb-1 flex items-center gap-1 select-none">
                                <Lightbulb className="w-3.5 h-3.5" /> แนวคิด (Mindset)
                              </h4>
                              <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
                                <SafeHtml content={q.mindset} />
                              </p>
                            </div>

                            <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/10">
                              <h4 className="text-yellow-400 font-bold text-[11px] mb-1 flex items-center gap-1 select-none">
                                <Zap className="w-3.5 h-3.5" /> เทคนิคทำเร็ว (Speed Hack)
                              </h4>
                              <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
                                <SafeHtml content={q.speedHack} />
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
