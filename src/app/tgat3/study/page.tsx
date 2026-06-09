"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import StudyChapter from "@/components/study/StudyChapter";
import { STUDY_CHAPTERS } from "@/data/studyContent";
import { TGAT3_QUESTIONS } from "@/data/tgat3";

export default function TGAT3StudyPage() {
  const chapters = STUDY_CHAPTERS.filter(c => c.examId === "tgat3");

  return (
    <main className="min-h-screen bg-[#050b14] text-white p-4 md:p-8 font-sans pb-28">
      {/* Background decoration */}
      <div className="fixed top-0 right-0 w-[50vw] h-[50vw] rounded-full bg-yellow-500/5 blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-yellow-400" /> TGAT3: Study Guide
              </h1>
              <p className="text-sm text-slate-400 mt-1">บทเรียนและเทคนิคการทำข้อสอบ Future Workforce Competencies</p>
            </div>
          </div>

          <Link href="/tgat3" className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
            เริ่มทำข้อสอบจริง <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Chapters */}
        {chapters.length > 0 ? (
          <div className="space-y-12">
            {chapters.map((chapter) => {
              // Extract questions for this chapter's mini quiz
              const quizQs = TGAT3_QUESTIONS.filter(q => chapter.miniQuizIds.includes(q.id));
              
              return (
                <StudyChapter 
                  key={chapter.id} 
                  chapter={chapter} 
                  questionsForQuiz={quizQs} 
                />
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/40 border border-white/10 rounded-3xl">
            <p className="text-slate-400">กำลังเตรียมเนื้อหาสำหรับวิชานี้...</p>
          </div>
        )}
      </div>
    </main>
  );
}
