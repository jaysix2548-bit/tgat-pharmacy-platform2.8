"use client";

import { motion } from "framer-motion";
import type { Question } from "@/types/exam";
import { useExamStore } from "@/store/examStore";
import { SafeHtml } from "@/components/SafeHtml";

interface QuestionCardProps {
  question: Question;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  const { answers, setAnswer, isFinished } = useExamStore();
  const selectedAnswer = answers[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-4xl mx-auto"
    >
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-bold border border-cyan-500/30">
            ข้อที่ {index + 1}
          </span>
          <span className="text-slate-400 text-sm font-medium">{question.partTitle}</span>
        </div>
        <span className="text-slate-500 text-sm bg-slate-800/50 px-3 py-1 rounded-full">
          เวลาแนะนำ: {question.suggestedTime}
        </span>
      </div>

      {question.passage && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 mb-8 text-slate-300 leading-relaxed text-lg">
          <SafeHtml content={question.passage} />
        </div>
      )}

      <div className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-8">
        <SafeHtml content={question.text} />
      </div>

      <div className="space-y-4">
        {question.options.map((option, i) => {
          const isSelected = selectedAnswer === i;
          const isCorrect = isFinished && question.answer === i;
          const isWrongSelected = isFinished && isSelected && !isCorrect;

          let optionStyle = "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500";
          
          if (isSelected && !isFinished) {
            optionStyle = "bg-cyan-500/20 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]";
          } else if (isFinished) {
            if (isCorrect) optionStyle = "bg-green-500/20 border-green-500 text-green-300";
            else if (isWrongSelected) optionStyle = "bg-red-500/20 border-red-500 text-red-300 opacity-70";
            else optionStyle = "bg-slate-800/30 border-slate-800 text-slate-500 opacity-50";
          }

          return (
            <motion.button
              key={i}
              disabled={isFinished}
              onClick={() => setAnswer(index, i)}
              whileHover={!isFinished ? { scale: 1.01 } : {}}
              whileTap={!isFinished ? { scale: 0.98 } : {}}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 ${optionStyle}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm border-2 ${
                isSelected && !isFinished ? "border-cyan-400 text-cyan-400" :
                isCorrect ? "border-green-400 text-green-400 bg-green-500/10" :
                isWrongSelected ? "border-red-400 text-red-400" :
                "border-slate-500 text-slate-400"
              }`}>
                {i + 1}
              </div>
              <span className="mt-1 text-lg leading-relaxed">
                <SafeHtml content={option} />
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
