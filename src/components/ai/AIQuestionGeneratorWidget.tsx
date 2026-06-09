"use client";

import React, { useState } from "react";
import type { AIGeneratedQuestion } from "@/types/ai";
import type { Difficulty, ExamId } from "@/types/exam";
import { HelpCircle, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Zap } from "lucide-react";
import { SafeHtml } from "@/components/SafeHtml";

interface AIQuestionGeneratorWidgetProps {
  onGenerateQuestion: (topic: string, difficulty: Difficulty, examId: ExamId) => AIGeneratedQuestion;
}

export default function AIQuestionGeneratorWidget({ onGenerateQuestion }: AIQuestionGeneratorWidgetProps) {
  const [activeTopic, setActiveTopic] = useState("Conversation & Dialogue");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Easy");
  const [generatedQ, setGeneratedQ] = useState<AIGeneratedQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const topicsList = [
    { name: "Conversation & Dialogue", examId: "tgat1" as const },
    { name: "Vocabulary & Context Clues", examId: "tgat1" as const },
    { name: "Numerical Reasoning", examId: "tgat2" as const },
    { name: "Logical Reasoning", examId: "tgat2" as const },
    { name: "Ethics & Integrity", examId: "tgat3" as const },
  ];

  const handleGenerate = () => {
    const selected = topicsList.find((t) => t.name === activeTopic) || topicsList[0];
    const q = onGenerateQuestion(selected.name, selectedDifficulty, selected.examId);
    setGeneratedQ(q);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !generatedQ) return;
    
    setGeneratedQ((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        userAnswer: selectedAnswer,
        isCorrect: selectedAnswer === prev.answer,
      };
    });
    setIsAnswered(true);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
      
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 text-xs font-bold">
          <HelpCircle className="w-4 h-4" /> AI Practice Generator (Drills)
        </div>
        <h3 className="text-xl font-black text-white leading-tight">
          กล่องสุ่มข้อสอบเสริมเฉพาะจุดอ่อน
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          สุ่มโจทย์ฝึกหัดตามหัวข้อที่คุณระบุและเลือกความท้าทายระดับความยากด้วยระบบวิเคราะห์เฉลย AI
        </p>
      </div>

      {/* Selector Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 select-none">
            หัวข้อคำถาม (Syllabus Topic)
          </label>
          <select
            value={activeTopic}
            onChange={(e) => setActiveTopic(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-neon-blue transition-colors font-semibold"
          >
            {topicsList.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.examId.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 select-none">
            ระดับความยาก (Difficulty Tier)
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-xl border border-white/10 h-[38px] items-center">
            {(["Easy", "Medium", "Hard", "Elite"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(d)}
                className={`py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none h-full flex items-center justify-center ${
                  selectedDifficulty === d
                    ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/20 font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            className="w-full py-2.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-extrabold rounded-xl text-xs hover:scale-105 active:scale-95 transition-transform flex items-center justify-center gap-1.5 shadow-lg shadow-neon-blue/20"
          >
            สุ่มโจทย์ฝึกหัดอัจฉริยะ <Sparkles className="w-4 h-4 text-yellow-400" />
          </button>
        </div>
      </div>

      {/* Generated Quiz Display */}
      {generatedQ && (
        <div className="border-t border-white/5 pt-6 space-y-5">
          <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center pb-3.5 border-b border-white/5">
              <span className="text-[10px] text-neon-blue font-bold bg-neon-blue/10 border border-neon-blue/20 px-3 py-1 rounded-lg uppercase tracking-wider">
                Drill Question: {generatedQ.topic} ({generatedQ.difficulty})
              </span>
              <span className="text-[10px] text-slate-500 font-bold font-mono">
                AI Drill Simulator
              </span>
            </div>

            <p className="text-xs md:text-sm font-bold text-white leading-relaxed pt-2">
              <SafeHtml content={generatedQ.text} />
            </p>

            <div className="space-y-3 pt-2">
              {generatedQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrectOption = generatedQ.answer === idx;

                let optStyle = "bg-white/5 border-white/5 hover:bg-white/10 hover:border-slate-500 text-slate-300";
                if (isAnswered) {
                  if (isCorrectOption) {
                    optStyle = "bg-green-500/20 border-green-500 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]";
                  } else if (isSelected) {
                    optStyle = "bg-red-500/20 border-red-500 text-red-300";
                  } else {
                    optStyle = "bg-white/5 border-white/5 opacity-50 text-slate-400";
                  }
                } else if (isSelected) {
                  optStyle = "bg-neon-blue/20 border-neon-blue text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]";
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => setSelectedAnswer(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-start gap-3.5 font-semibold leading-relaxed ${optStyle}`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? "border-neon-blue text-neon-blue" : "border-slate-500 text-slate-400"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="mt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>

            {!isAnswered && selectedAnswer !== null && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSubmitAnswer}
                  className="px-5 py-2.5 bg-green-500 hover:bg-green-400 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow-lg shadow-green-500/20 transition-all active:scale-95"
                >
                  ส่งคำตอบเพื่อวิเคราะห์แนวคิด <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Feedback Explanation panels */}
          {isAnswered && generatedQ.userAnswer !== undefined && (
            <div className="bg-slate-950/80 border border-white/10 p-5 md:p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                {generatedQ.isCorrect ? (
                  <span className="text-green-400 font-black flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-xl border border-green-500/20 text-xs animate-bounce">
                    ✓ ตอบถูกต้องสมบูรณ์!
                  </span>
                ) : (
                  <span className="text-red-400 font-black flex items-center gap-1 bg-red-500/10 px-3 py-1 rounded-xl border border-red-500/20 text-xs animate-shake">
                    ✗ คำตอบยังคลาดเคลื่อน
                  </span>
                )}
              </div>

              <div className="bg-slate-900/60 rounded-xl p-4 border border-white/5">
                <h5 className="font-extrabold text-neon-blue text-xs mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> เฉลยคำอธิบาย (Correct logic):
                </h5>
                <p className="text-slate-300 text-xs leading-relaxed">
                  <SafeHtml content={generatedQ.correctExplanation} />
                </p>
              </div>

              {!generatedQ.isCorrect && (
                <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
                  <h5 className="font-extrabold text-red-400 text-xs mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> วิเคราะห์จุดพลั้งพลาดที่คุณเลือก:
                  </h5>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    <SafeHtml content={generatedQ.wrongExplanation} />
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl">
                  <h5 className="font-extrabold text-purple-400 text-xs mb-1 flex items-center gap-1">
                    <Lightbulb className="w-4 h-4 text-purple-400" /> แนะนำกระบวนการคิด (Mindset):
                  </h5>
                  <p className="text-slate-300 text-xs leading-relaxed italic">
                    <SafeHtml content={generatedQ.mindset} />
                  </p>
                </div>

                <div className="bg-pink-500/5 border border-pink-500/10 p-4 rounded-xl">
                  <h5 className="font-extrabold text-pink-500 text-xs mb-1 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-pink-500 animate-pulse" /> ทางลัดทำไว (Speed Hack):
                  </h5>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    <SafeHtml content={generatedQ.speedHack} />
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
