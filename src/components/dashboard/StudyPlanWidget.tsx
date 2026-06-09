"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";
import { BookOpen, Calendar, CheckSquare, Square, ChevronRight, Award, Plus, Trash } from "lucide-react";
import { motion } from "framer-motion";

export default function StudyPlanWidget() {
  const { studyPlans, mistakes, startStudyPlan, toggleStudyPlanDay } = useExamStore();
  const [mounted, setMounted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<7 | 14 | 30>(7);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-48 w-full bg-slate-900/40 border border-white/5 rounded-3xl animate-pulse" />
    );
  }

  // Find weakest topic for dynamic adaptive plan generation
  const getWeakestTopic = () => {
    const list = Object.values(mistakes);
    if (list.length === 0) return "Conversation & Dialogue";
    const counts: Record<string, number> = {};
    list.forEach((m) => {
      let q = TGAT1_QUESTIONS.find((x) => x.id === m.questionId) as import("@/types/exam").Question | undefined;
      if (!q) q = TGAT2_QUESTIONS.find((x) => x.id === m.questionId);
      if (!q) q = TGAT3_QUESTIONS.find((x) => x.id === m.questionId);
      if (q) {
        counts[q.topic] = (counts[q.topic] || 0) + (m.attempts - m.correct);
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "Conversation & Dialogue";
  };

  const weakTopic = getWeakestTopic();
  const planId = "tgat_personalized_plan";
  const activePlan = studyPlans[planId];

  // Dynamic daily checklists based on selected length and weakest topic
  const getPlanChecklist = (day: number) => {
    // Return checklist specifically adapted to day and weaknesses
    if (day === 1) {
      return [
        { text: `ติวบทเรียนเรื่อง "${weakTopic}" ใน Study section`, completed: false },
        { text: "ทำ Mini Quiz ประจำบทเรียนเพื่อทดสอบความรู้พื้นฐาน", completed: false }
      ];
    }
    if (day === 2) {
      return [
        { text: "ฝึกโจทย์ Conversation & Dialogue (TGAT1) ระดับ Medium 10 ข้อ", completed: false },
        { text: "ล้างประเด็นที่ค้างอยู่ใน Mistake Notebook", completed: false }
      ];
    }
    if (day === 3) {
      return [
        { text: "ทบทวนสูตรความสัมพันธ์อนุกรมใน Numerical Reasoning (TGAT2)", completed: false },
        { text: "วิเคราะห์ความสมเหตุผลของโจทย์เชิงตรรกะ", completed: false }
      ];
    }
    if (day === 4) {
      return [
        { text: "เจาะลึกจิตวิญญาณการบริการและจริยธรรมสุขภาพใน TGAT3 Ethics", completed: false },
        { text: "ฝึกโจทย์จริยธรรมคัดพิเศษ 5 ข้อเพื่อมองหารูปแบบช้อยส์หลอก", completed: false }
      ];
    }
    if (day === 5) {
      return [
        { text: `ลุยทำโจทย์ Weakness Booster Pack ในเรื่อง "${weakTopic}" อีกครั้ง`, completed: false },
        { text: "ฝึกจับเวลาทำข้อสอบ TGAT1 English ความเร็วเฉลี่ยต่ำกว่า 45 วินาทีต่อข้อ", completed: false }
      ];
    }
    if (day === 6) {
      return [
        { text: "ศึกษาคู่มือเทคนิคความเร็วการทำข้อสอบ (Speed Hack คู่มือ)", completed: false },
        { text: "สะสมและทบทวนความหมายคำศัพท์เชิงเทคนิคแพทย์ที่พบบ่อยในบทความ", completed: false }
      ];
    }
    return [
      { text: "ทำสอบจำลองแบบจับเวลาจริง Full Mock Exam (200 ข้อ)", completed: false },
      { text: "วิเคราะห์ Readiness Radar chart เพื่อวางแผนโค้งสุดท้ายก่อนสอบจริง", completed: false }
    ];
  };

  const handleStartPlan = () => {
    startStudyPlan(planId, selectedDuration);
  };

  return (
    <div className="saas-card flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[45px] pointer-events-none rounded-full" />

      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="heading-md text-white">Adaptive Study Calendar</h3>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Personalized Plan
          </span>
        </div>

        {activePlan ? (
          <div className="mt-5 space-y-4">
            {/* Calculation of plan completion percentage */}
            {(() => {
              const totalDays = activePlan.type;
              const completedCount = Object.values(activePlan.completedDays).filter(Boolean).length;
              const progressPct = Math.round((completedCount / totalDays) * 100);

              // Find first incomplete day as the active day
              let activeDay = 1;
              for (let d = 1; d <= totalDays; d++) {
                if (!activePlan.completedDays[d]) {
                  activeDay = d;
                  break;
                }
              }

              const dailyChecklist = getPlanChecklist(activeDay);

              return (
                <div className="space-y-4">
                  {/* Progress Header */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">ความสำเร็จของแผน {activePlan.type} วัน</span>
                    <span className="text-indigo-400 font-bold">{progressPct}%</span>
                  </div>

                  <div className="w-full bg-slate-950 border border-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Day Checklist */}
                  <div className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl space-y-3 mt-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        Active Day: Day {activeDay}
                      </span>
                      <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        ปรับตามจุดอ่อนเรียบร้อย
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1.5">
                      {dailyChecklist.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 text-slate-300 text-xs font-medium leading-relaxed">
                          <CheckSquare className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Checkoff Active Day button */}
                    <button
                      onClick={() => toggleStudyPlanDay(planId, activeDay)}
                      className="w-full mt-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> เสร็จสิ้นภารกิจประจำวันนี้
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Selection interface when no plan active */
          <div className="mt-5 space-y-5">
            <p className="text-slate-400 text-xs leading-relaxed">
              ไม่มีแผนกิจกรรมทบทวนที่กำลังรันอยู่ คุณสามารถเลือกช่วงเวลาความตั้งใจ เพื่อจัดตารางติวอัตโนมัติตามจุดอ่อนได้ทันที
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDuration(d as 7 | 14 | 30)}
                  className={`py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedDuration === d
                      ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {d} วัน
                </button>
              ))}
            </div>

            <button
              onClick={handleStartPlan}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
            >
              สร้างแผน Study Plan ส่วนตัว <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="text-[9px] text-slate-500 mt-6 pt-4 border-t border-white/5">
        * แผนงานจะประเมินคะแนนสอบล่าสุดเพื่อนำพาร์ทที่คะแนนวิกฤตที่สุดขึ้นมาเป็นอันดับที่หนึ่ง เพื่อเร่งประสิทธิภาพคะแนนสอบจริง
      </div>
    </div>
  );
}
