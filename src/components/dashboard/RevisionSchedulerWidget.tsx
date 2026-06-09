"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { useRouter } from "next/navigation";
import { isMistakeDue, calculateSM2 } from "@/lib/spacedRepetition";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";
import { Calendar, CheckCircle2, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function RevisionSchedulerWidget() {
  const router = useRouter();
  const { mistakes, updateMistakeReview, setQuestions } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-48 w-full bg-slate-900/40 border border-white/5 rounded-3xl animate-pulse" />
    );
  }

  // Get due mistakes list
  const dueMistakes = Object.values(mistakes).filter((m) => {
    return isMistakeDue(m.nextReviewDate);
  });

  const handleStartRevision = () => {
    if (dueMistakes.length === 0) return;

    // Collect full question details for due mistakes
    const questionsToRevise: import("@/types/exam").Question[] = [];
    
    dueMistakes.forEach((m) => {
      let q = TGAT1_QUESTIONS.find((x) => x.id === m.questionId) as import("@/types/exam").Question | undefined;
      if (!q) q = TGAT2_QUESTIONS.find((x) => x.id === m.questionId);
      if (!q) q = TGAT3_QUESTIONS.find((x) => x.id === m.questionId);
      
      if (q) questionsToRevise.push(q);
    });

    if (questionsToRevise.length > 0) {
      // Load questions into active session, setting examId of the first question
      const targetExamId = dueMistakes[0].examId;
      setQuestions(targetExamId, questionsToRevise, "practice");
      
      // Update reviews date automatically on launch to avoid repeating same stack
      dueMistakes.forEach((m) => {
        const nextSM2 = calculateSM2(4, m.intervalDays || 1, m.easeFactor || 2.5, m.spacedStep || 1);
        updateMistakeReview(m.questionId, nextSM2.easeFactor, nextSM2.intervalDays, nextSM2.spacedStep, nextSM2.nextReviewDate);
      });

      router.push(`/${targetExamId}`);
    }
  };

  return (
    <div className="saas-card flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[45px] pointer-events-none rounded-full" />
      
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="heading-md text-white">Smart Spaced Repetition</h3>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            SM-2 Algorithm
          </span>
        </div>

        {dueMistakes.length > 0 ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 p-4 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-white text-xs leading-tight">
                  มีหัวข้อถึงกำหนดทบทวนทั้งหมด {dueMistakes.length} ข้อ
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  ระบบวิเคราะห์เว้นระยะห่างการตอบผิดตามกลไกความทรงจำ แนะนำให้กลับไปทบทวนเพื่อย้ายข้อสอบเหล่านี้ไปสู่ความจำระยะยาว (Long-term memory)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 bg-slate-950/40 border border-white/5 p-4 rounded-xl">
              <div>
                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">Due Reviews Queue</span>
                <p className="text-xs text-white font-semibold mt-0.5">
                  {dueMistakes.length} Questions Overdue
                </p>
              </div>
              
              <button
                onClick={handleStartRevision}
                className="btn-primary"
              >
                เริ่มทบทวน <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="font-semibold text-white text-sm">
              ไม่มีคิวทบทวนที่ค้างอยู่!
            </h4>
            <p className="text-[10px] text-slate-500 max-w-[240px] mt-1 leading-relaxed">
              ยอดเยี่ยมมาก คุณจัดสรรและล้างคิว Spaced Repetition ครบถ้วนแล้ว แนะนำท้าทายตนเองใน Mock Test ต่อได้เลยครับ
            </p>
          </div>
        )}
      </div>

      <div className="text-[9px] text-slate-500 mt-6 pt-4 border-t border-white/5">
        * Spaced Repetition ช่วยลดโอกาสลืมลงถึง 80% เมื่อทบทวนในระยะเวลาที่มีความเสี่ยงที่จะลืมสูง (Intervals: 1d → 3d → 7d → 14d)
      </div>
    </div>
  );
}
