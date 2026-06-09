"use client";

import React, { useState } from "react";
import type { Question } from "@/types/exam";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { ExplanationPanel } from "@/components/exam/ExplanationPanel";
import { CheckCircle2, RotateCcw } from "lucide-react";

interface MiniQuizProps {
  questions: Question[];
}

export default function MiniQuiz({ questions }: MiniQuizProps) {
  // Local state for the mini-quiz
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  // We need to mock the Zustand store's exact behavior specifically for the mini-quiz 
  // since the QuestionCard/ExplanationPanel connect to the store directly.
  // Actually, wait: QuestionCard uses useExamStore directly! 
  // To make MiniQuiz reusable without mutating the main exam state, we'll build a simplified inline card just for the quiz, OR we update QuestionCard to optionally take controlled props.
  // Given time, let's just make a localized, lightweight card here.

  const handleFinish = () => {
    let s = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) s++;
    });
    setScore(s);
    setIsFinished(true);
  };

  const handleReset = () => {
    setAnswers({});
    setIsFinished(false);
    setScore(0);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
      <h3 className="text-xl font-bold text-white mb-6">Mini Quiz ทบทวนความรู้</h3>

      {isFinished && (
        <div className="mb-8 p-6 bg-slate-800/50 rounded-2xl text-center border border-white/5">
          <p className="text-slate-400 font-bold mb-2">คะแนนของคุณ</p>
          <div className="text-4xl font-black text-neon-blue mb-4">
            {score} / {questions.length}
          </div>
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-bold flex items-center gap-2 mx-auto transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> ทำใหม่อีกครั้ง
          </button>
        </div>
      )}

      <div className="space-y-12">
        {questions.map((q, idx) => {
          const selectedAnswer = answers[idx];
          const isCorrect = isFinished && selectedAnswer === q.answer;
          const isWrong = isFinished && selectedAnswer !== undefined && selectedAnswer !== q.answer;

          return (
            <div key={q.id} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-slate-300">
                  ข้อ {idx + 1}
                </span>
                <span className="text-sm text-slate-400">{q.difficulty}</span>
              </div>
              
              <div className="text-lg text-white mb-4 whitespace-pre-wrap">{q.text}</div>

              <div className="space-y-2">
                {q.options.map((opt, optIdx) => {
                  let style = "bg-slate-950/50 border border-white/5 text-slate-300 hover:bg-white/5";
                  
                  if (selectedAnswer === optIdx) {
                    style = "bg-neon-blue/20 border-neon-blue text-white";
                  }
                  
                  if (isFinished) {
                    if (q.answer === optIdx) {
                      style = "bg-green-500/20 border-green-500 text-green-400"; // Always show correct answer
                    } else if (selectedAnswer === optIdx) {
                      style = "bg-red-500/20 border-red-500 text-red-400"; // Mark wrong answer
                    } else {
                      style = "bg-slate-950/30 border-white/5 text-slate-500 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isFinished}
                      onClick={() => setAnswers(prev => ({ ...prev, [idx]: optIdx }))}
                      className={`w-full text-left p-4 rounded-xl transition-all ${style}`}
                    >
                      <span className="font-bold mr-3 opacity-50">{optIdx + 1}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {isFinished && (
                <div className={`mt-4 p-4 rounded-xl border ${isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <h5 className="font-bold text-sm mb-2 text-slate-200">เฉลย:</h5>
                  <p className="text-sm text-slate-400">{q.correctExplanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isFinished && (
        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleFinish}
            disabled={Object.keys(answers).length !== questions.length}
            className="px-6 py-3 bg-neon-blue text-black font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 hover:bg-cyan-400 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" /> ตรวจคำตอบ
          </button>
        </div>
      )}
    </div>
  );
}
