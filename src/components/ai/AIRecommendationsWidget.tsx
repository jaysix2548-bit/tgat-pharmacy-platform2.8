"use client";

import React from "react";
import type { AIStudyRecommendation } from "@/types/ai";
import { Zap, Clock, AlertCircle, ArrowUpRight, Award } from "lucide-react";

interface AIRecommendationsWidgetProps {
  recommendations: AIStudyRecommendation[];
  onStartQuest: (topicName: string) => void;
}

export default function AIRecommendationsWidget({ recommendations, onStartQuest }: AIRecommendationsWidgetProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
      
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-3 text-xs font-bold">
          <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Recommended Study Path
        </div>
        <h3 className="text-xl font-black text-white leading-tight">
          เส้นทางการเรียนรู้แนะนำประจำวันนี้
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          หัวข้อที่ระบบแนะนำให้มุ่งเน้นตามระดับความสำคัญและงบเวลาเป้าหมายเพื่อเพิ่มคะแนนจริง
        </p>
      </div>

      {recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec) => {
            const isHigh = rec.priority === "High";
            const isMed = rec.priority === "Medium";

            let priorityBg = "bg-green-500/10 border-green-500/20 text-green-400";
            if (isHigh) priorityBg = "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse";
            else if (isMed) priorityBg = "bg-amber-500/10 border-amber-500/20 text-amber-400";

            return (
              <div
                key={rec.topic}
                className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-white/10 transition-colors"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-[25px] pointer-events-none rounded-full" />
                
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`text-[9px] uppercase font-mono font-black border px-2 py-0.5 rounded-full select-none ${priorityBg}`}>
                      {rec.priority} Priority
                    </span>
                    <span className="text-[9px] uppercase text-slate-500 font-bold font-mono">
                      {rec.examId.toUpperCase()}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-white text-xs mt-3 leading-tight group-hover:underline">
                    {rec.topic}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    {rec.dailyboosterQuest}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>เป้าหมาย: {rec.targetStudyMinutes} นาที</span>
                  </div>
                  
                  <button
                    onClick={() => onStartQuest(rec.topic)}
                    className="p-1 bg-white/5 hover:bg-neon-blue hover:text-black border border-white/5 rounded-lg text-slate-300 transition-all flex items-center justify-center active:scale-95 shadow-inner"
                    title="เริ่มฝึกตามหัวข้อแนะนำ"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center bg-slate-950/40 border border-white/5 rounded-2xl">
          <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-3">
            <Award className="w-6 h-6 text-green-400" />
          </div>
          <h4 className="font-extrabold text-white text-sm">
            ความเข้าใจสมบูรณ์ยอดเยี่ยม!
          </h4>
          <p className="text-[10px] text-slate-500 max-w-[280px] mt-1 leading-relaxed">
            ระบบไม่มีหัวข้อแนะนำเร่งด่วนในหมวดอ่อนเลย เนื่องจากคุณยังตอบคำถามถูกต้องครบถ้วน
          </p>
        </div>
      )}

    </div>
  );
}
