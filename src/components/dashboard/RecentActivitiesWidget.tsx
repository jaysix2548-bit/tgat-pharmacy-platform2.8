"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { Clock, CheckCircle2, AlertCircle, FileText, Zap } from "lucide-react";

interface ActivityLog {
  id: string;
  type: "exam" | "mistake" | "streak" | "plan";
  text: string;
  timestamp: string;
}

export default function RecentActivitiesWidget() {
  const { examHistory, mistakes, streakCount } = useExamStore();
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    setMounted(true);

    const generatedLogs: ActivityLog[] = [];
    let counter = 0;

    // Log from examHistory
    examHistory.slice(-2).forEach((h) => {
      generatedLogs.push({
        id: `act-${counter++}`,
        type: "exam",
        text: `ทำแบบทดสอบจำลอง ${h.examId.toUpperCase()} ได้คะแนน ${h.score}/${h.total}`,
        timestamp: new Date(h.timestamp).toLocaleDateString("th-TH", { hour: "2-digit", minute: "2-digit" }),
      });
    });

    // Log from mistakes cleared
    const mistakeCount = Object.keys(mistakes).length;
    if (mistakeCount > 0) {
      generatedLogs.push({
        id: `act-${counter++}`,
        type: "mistake",
        text: `มีข้อสอบค้างทบทวนในสมุดโน้ต ${mistakeCount} ข้อ`,
        timestamp: "ล่าสุด",
      });
    }

    // Log from streak
    if (streakCount > 0) {
      generatedLogs.push({
        id: `act-${counter++}`,
        type: "streak",
        text: `รักษาสถิติทำโจทย์ต่อเนื่องได้สำเร็จ! ปัจจุบันอยู่ที่ ${streakCount} วัน`,
        timestamp: "วันนี้",
      });
    }

    // Baseline default logs for beautiful empty state
    if (generatedLogs.length === 0) {
      generatedLogs.push({
        id: `act-d1`,
        type: "plan",
        text: "ยินดีต้อนรับเข้าสู่ Premium TGAT Simulator แพลตฟอร์มบอร์ดติวเต็มรูปแบบ",
        timestamp: "วันเริ่มต้น",
      });
    }

    setLogs(generatedLogs.slice(0, 4));
  }, [examHistory, mistakes, streakCount]);

  if (!mounted) {
    return (
      <div className="h-48 w-full bg-slate-900/40 border border-white/5 rounded-3xl animate-pulse" />
    );
  }

  return (
    <div className="saas-card flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[45px] pointer-events-none rounded-full" />
      
      <div>
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
            <Clock className="w-4.5 h-4.5 text-blue-400" /> Recent Activities
          </h3>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider font-mono">
            Logs Ticker
          </span>
        </div>

        <div className="space-y-4 mt-5">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3.5 text-xs font-medium leading-relaxed">
              <div className="mt-0.5 flex-shrink-0">
                {log.type === "exam" ? (
                  <FileText className="w-4 h-4 text-blue-400" />
                ) : log.type === "mistake" ? (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                ) : log.type === "streak" ? (
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400/10" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
              </div>
              <div className="flex-1 text-slate-300">
                {log.text}
              </div>
              <div className="text-[9px] text-slate-500 font-medium font-mono">
                {log.timestamp}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
