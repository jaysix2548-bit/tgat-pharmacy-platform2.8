"use client";

import React from "react";
import type { AIWeaknessReport } from "@/types/ai";
import { ShieldAlert, CheckCircle2, ChevronRight, Activity, BookOpen, Award } from "lucide-react";
import { SafeHtml } from "@/components/SafeHtml";

interface AIWeaknessSummaryWidgetProps {
  reports: AIWeaknessReport[];
  onSelectTopic: (topicName: string) => void;
}

export default function AIWeaknessSummaryWidget({ reports, onSelectTopic }: AIWeaknessSummaryWidgetProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
      
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-3 text-xs font-bold">
          <ShieldAlert className="w-4 h-4" /> Cumulative Weakness Analysis
        </div>
        <h3 className="text-xl font-black text-white leading-tight">
          วินิจฉัยจุดอ่อนสะสมเชิงลึก
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          ระบบคำนวณความแม่นยำรายหัวข้อ พร้อมสรุปพฤติกรรมการตอบผิดพลาดและกลยุทธ์แก้ไขด่วน
        </p>
      </div>

      {/* Weakness Diagnostic Cards */}
      <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
        {reports.map((report) => {
          const isCritical = report.accuracy < 60;
          const isWarning = report.accuracy >= 60 && report.accuracy < 75;

          let badgeColor = "bg-green-500/10 border-green-500/20 text-green-400";
          let accuracyColor = "text-green-400";
          let statusLabel = "Stable";

          if (isCritical) {
            badgeColor = "bg-red-500/10 border-red-500/20 text-red-400";
            accuracyColor = "text-red-400";
            statusLabel = "Critical Weakness";
          } else if (isWarning) {
            badgeColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
            accuracyColor = "text-amber-400";
            statusLabel = "Medium Risk";
          }

          return (
            <div
              key={report.topic}
              className="bg-slate-950/60 border border-white/5 p-5 rounded-2xl space-y-4 hover:border-white/10 transition-colors"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/5 rounded-xl text-slate-300">
                    {report.examId === "tgat1" ? (
                      <BookOpen className="w-4.5 h-4.5 text-cyan-400" />
                    ) : report.examId === "tgat2" ? (
                      <Activity className="w-4.5 h-4.5 text-pink-400" />
                    ) : (
                      <Award className="w-4.5 h-4.5 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs leading-tight">
                      {report.topic}
                    </h4>
                    <span className="text-[9px] uppercase text-slate-500 font-bold font-mono">
                      {report.examId.toUpperCase()} Syllabus Section
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[9px] uppercase font-mono font-black border px-2 py-0.5 rounded-full select-none ${badgeColor}`}>
                    {statusLabel}
                  </span>
                  <div className="text-right">
                    <span className={`text-base font-black font-mono ${accuracyColor}`}>
                      {report.accuracy}%
                    </span>
                    <p className="text-[8px] text-slate-500 font-bold">ACCURACY RATE</p>
                  </div>
                </div>
              </div>

              {/* Error analysis grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed font-semibold">
                <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                  <h5 className="font-extrabold text-red-400 text-[10px] mb-1">🚨 พฤติกรรมการตอบผิดบ่อย (Error Pattern):</h5>
                  <p className="text-slate-300">
                    {report.commonErrorPattern}
                  </p>
                </div>

                <div className="bg-cyan-500/5 border border-cyan-500/10 p-3 rounded-xl">
                  <h5 className="font-extrabold text-cyan-400 text-[10px] mb-1">💡 ยุทธวิธีคิดที่ถูกต้อง (Corrective Action):</h5>
                  <p className="text-slate-300">
                    {report.remedialConcept}
                  </p>
                </div>
              </div>

              {/* Action trigger button */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onSelectTopic(report.topic)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold border border-white/5 transition-all flex items-center gap-1 active:scale-95"
                >
                  เจาะลึกแบบฝึกหัดหัวข้อนี้ <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
