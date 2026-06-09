"use client";

import React, { useState } from "react";
import { useExamStore } from "@/store/examStore";
import { BookOpen, Calendar, CheckSquare, ChevronRight, Plus } from "lucide-react";

interface AIStudyPlanWidgetProps {
  weakestTopic: string;
}

export default function AIStudyPlanWidget({ weakestTopic }: AIStudyPlanWidgetProps) {
  const { studyPlans, startStudyPlan, toggleStudyPlanDay } = useExamStore();
  const [selectedDays, setSelectedDays] = useState<7 | 14 | 30 | 60>(7);

  const planId = "tgat_personalized_plan";
  const activePlan = studyPlans[planId];

  const getPlanChecklist = (day: number) => {
    if (day === 1) {
      return [
        { text: `ติวบทเรียนเรื่อง "${weakestTopic}" ใน Study section` },
        { text: "ทำ Mini Quiz ประจำบทเรียนเพื่อทดสอบความรู้พื้นฐาน" }
      ];
    }
    if (day === 2) {
      return [
        { text: "ฝึกโจทย์ Conversation & Dialogue (TGAT1) ระดับ Medium 10 ข้อ" },
        { text: "ล้างประเด็นที่ค้างอยู่ใน Mistake Notebook" }
      ];
    }
    if (day === 3) {
      return [
        { text: "ทบทวนสูตรความสัมพันธ์อนุกรมใน Numerical Reasoning (TGAT2)" },
        { text: "วิเคราะห์ความสมเหตุผลของโจทย์เชิงตรรกะ" }
      ];
    }
    if (day === 4) {
      return [
        { text: "เจาะลึกจิตวิญญาณการบริการและจริยธรรมสุขภาพใน TGAT3 Ethics" },
        { text: "ฝึกโจทย์จริยธรรมคัดพิเศษ 5 ข้อเพื่อมองหารูปแบบช้อยส์หลอก" }
      ];
    }
    if (day === 5) {
      return [
        { text: `ลุยทำโจทย์ Weakness Booster Pack ในเรื่อง "${weakestTopic}" อีกครั้ง` },
        { text: "ฝึกจับเวลาทำข้อสอบ TGAT1 English ความเร็วเฉลี่ยต่ำกว่า 45 วินาทีต่อข้อ" }
      ];
    }
    return [
      { text: "ทำสอบจำลองแบบจับเวลาจริง Full Mock Exam (200 ข้อ)" },
      { text: "วิเคราะห์ Readiness Radar chart เพื่อวางแผนโค้งสุดท้ายก่อนสอบจริง" }
    ];
  };

  const handleStart = () => {
    startStudyPlan(planId, selectedDays);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 blur-[45px] pointer-events-none rounded-full" />

      <div>
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-neon-purple" />
            <h3 className="font-black text-white text-base">Personalized Study Calendar</h3>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider font-mono text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded border border-neon-purple/20">
            Study Planner
          </span>
        </div>

        {activePlan ? (
          <div className="mt-5 space-y-4">
            {(() => {
              const totalDays = activePlan.type;
              const completedCount = Object.values(activePlan.completedDays).filter(Boolean).length;
              const progressPct = Math.round((completedCount / totalDays) * 100);

              let activeDay = 1;
              for (let d = 1; d <= totalDays; d++) {
                if (!activePlan.completedDays[d]) {
                  activeDay = d;
                  break;
                }
              }

              const checklist = getPlanChecklist(activeDay);

              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-extrabold">ความสำเร็จของแผน {activePlan.type} วัน</span>
                    <span className="text-neon-purple font-black">{progressPct}%</span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-neon-purple h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <div className="bg-slate-950/60 border border-white/5 p-4.5 rounded-2xl space-y-3 mt-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Active Day: Day {activeDay}
                      </span>
                      <span className="text-[10px] font-extrabold text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded border border-neon-purple/20">
                        Adaptive checklists
                      </span>
                    </div>

                    <div className="space-y-2.5 pt-1.5">
                      {checklist.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-slate-300 text-xs font-semibold leading-relaxed">
                          <CheckSquare className="w-4 h-4 text-neon-purple mt-0.5 flex-shrink-0" />
                          <span>{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => toggleStudyPlanDay(planId, activeDay)}
                      className="w-full mt-4 py-2.5 bg-neon-purple/10 hover:bg-neon-purple/20 text-neon-purple border border-neon-purple/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> เสร็จสิ้นแผนทบทวนวันนี้
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <p className="text-slate-400 text-xs leading-relaxed">
              จัดแจงปฏิทินอ่านหนังสือติวเข้มข้นเฉพาะตัว เลือกกำหนดวันทบทวนที่เหมาะกับตารางเวลาของคุณ
            </p>

            <div className="grid grid-cols-4 gap-1.5">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDays(d as 7 | 14 | 30 | 60)}
                  className={`py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all h-[36px] flex items-center justify-center ${
                    selectedDays === d
                      ? "bg-neon-purple/20 border-neon-purple text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {d} วัน
                </button>
              ))}
            </div>

            <button
              onClick={handleStart}
              className="w-full py-3 bg-neon-purple hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all active:scale-95"
            >
              เริ่มสร้าง Study Plan <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
