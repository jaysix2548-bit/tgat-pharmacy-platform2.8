"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, Zap } from "lucide-react";
import type { Question } from "@/types/exam";
import { useExamStore } from "@/store/examStore";
import { SafeHtml } from "@/components/SafeHtml";

interface ExplanationPanelProps {
  question: Question;
  index: number;
}

export function ExplanationPanel({ question, index }: ExplanationPanelProps) {
  const { answers } = useExamStore();
  const selectedAnswer = answers[index];
  const isCorrect = selectedAnswer === question.answer;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-6 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/80 max-w-4xl mx-auto shadow-xl"
    >
      <div className={`p-4 flex items-center gap-3 font-bold text-lg ${
        isCorrect ? "bg-green-500/10 text-green-400 border-b border-green-500/20" : "bg-red-500/10 text-red-400 border-b border-red-500/20"
      }`}>
        {isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
        {isCorrect ? "ยอดเยี่ยม! คุณตอบถูกต้อง" : "น่าเสียดาย! คุณตอบผิด"}
      </div>

      <div className="p-6 md:p-8 space-y-6">
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
          <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> เฉลยและคำอธิบาย
          </h4>
          <p className="text-slate-300 leading-relaxed">
            <SafeHtml content={question.correctExplanation} />
          </p>
        </div>

        {!isCorrect && selectedAnswer !== undefined && (
          <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/10">
            <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> ทำไมถึงผิด?
            </h4>
            <p className="text-slate-300 leading-relaxed">
              <SafeHtml content={question.wrongExplanation} />
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-purple-500/10 rounded-2xl p-5 border border-purple-500/20">
            <h4 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> แนวคิด (Mindset)
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              <SafeHtml content={question.mindset} />
            </p>
          </div>

          <div className="bg-yellow-500/10 rounded-2xl p-5 border border-yellow-500/20">
            <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" /> เทคนิคทำเร็ว (Speed Hack)
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              <SafeHtml content={question.speedHack} />
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
