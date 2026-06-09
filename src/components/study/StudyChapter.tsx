"use client";

import React, { useState } from "react";
import type { StudyChapter as StudyChapterType } from "@/types/exam";
import { BookOpen, Lightbulb, PenTool, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import MiniQuiz from "./MiniQuiz";

interface StudyChapterProps {
  chapter: StudyChapterType;
  questionsForQuiz: import("@/types/exam").Question[];
}

export default function StudyChapter({ chapter, questionsForQuiz }: StudyChapterProps) {
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <div className="space-y-8">
      {/* Chapter Content */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-neon-blue mb-6 flex items-center gap-3">
          <BookOpen className="w-6 h-6" /> {chapter.title}
        </h2>
        
        <p className="text-slate-300 leading-relaxed mb-8">
          {chapter.content}
        </p>

        {/* Examples Section */}
        {chapter.examples.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-slate-400" /> ตัวอย่างโจทย์ที่พบบ่อย
            </h3>
            <div className="space-y-3">
              {chapter.examples.map((ex, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-slate-300 text-sm whitespace-pre-wrap">
                  {ex}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mindset Section */}
        {chapter.mindsetTips.length > 0 && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" /> Mindset & เทคนิค
            </h3>
            <ul className="space-y-3">
              {chapter.mindsetTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quiz Toggle */}
        {!showQuiz && questionsForQuiz.length > 0 && (
          <div className="flex justify-center mt-8">
            <button 
              onClick={() => setShowQuiz(true)}
              className="px-8 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-105 transition-all"
            >
              ทำ Mini Quiz ทดสอบความเข้าใจ ({questionsForQuiz.length} ข้อ)
            </button>
          </div>
        )}
      </div>

      {/* Mini Quiz Section */}
      {showQuiz && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MiniQuiz questions={questionsForQuiz} />
        </motion.div>
      )}
    </div>
  );
}
