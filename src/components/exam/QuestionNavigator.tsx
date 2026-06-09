"use client";

import React from "react";
import { useExamStore } from "@/store/examStore";
import { Flag, CheckCircle } from "lucide-react";

interface QuestionNavigatorProps {
  onSelectQuestion?: (index: number) => void;
}

export default function QuestionNavigator({ onSelectQuestion }: QuestionNavigatorProps) {
  const {
    questions,
    currentQuestionIndex,
    answers,
    flags,
    goToQuestion,
  } = useExamStore();

  const handleSelect = (idx: number) => {
    goToQuestion(idx);
    if (onSelectQuestion) {
      onSelectQuestion(idx);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const pctComplete = Math.round((answeredCount / totalCount) * 100) || 0;

  return (
    <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col gap-4">
      {/* Progress Header */}
      <div>
        <div className="flex justify-between items-center text-sm font-semibold mb-2">
          <span className="text-slate-400">Exam Progress</span>
          <span className="text-neon-blue">{answeredCount} of {totalCount} answered ({pctComplete}%)</span>
        </div>
        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all duration-300"
            style={{ width: `${pctComplete}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400 border-t border-b border-white/5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-white/10 border border-white/10" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-neon-blue/20 border border-neon-blue/40" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-neon-purple/20 border border-neon-purple" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center justify-center w-3.5 h-3.5 rounded bg-red-500/10 border border-red-500/40 text-red-500 text-[10px] font-bold">🚩</span>
          <span>Flagged</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
        {questions.map((q, idx) => {
          const isActive = currentQuestionIndex === idx;
          const isAnswered = answers[idx] !== undefined;
          const isFlagged = flags[idx] === true;

          let btnClass = "border text-xs font-mono font-bold flex flex-col items-center justify-center relative transition-all active:scale-90 h-10 w-full rounded-xl ";
          
          if (isActive) {
            btnClass += "bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]";
          } else if (isAnswered) {
            btnClass += "bg-neon-blue/20 border-neon-blue/40 text-neon-blue hover:bg-neon-blue/30";
          } else {
            btnClass += "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-slate-500";
          }

          return (
            <button
              key={q.id}
              onClick={() => handleSelect(idx)}
              className={btnClass}
              title={`Question ${idx + 1}: ${q.topic}`}
            >
              {idx + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold animate-bounce shadow">
                  🚩
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
