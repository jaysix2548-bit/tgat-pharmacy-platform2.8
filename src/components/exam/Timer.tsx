"use client";

import { useEffect } from "react";
import { Clock } from "lucide-react";
import { useExamStore } from "@/store/examStore";

export function Timer() {
  const { timeRemaining, setTimeRemaining, isFinished, finishExam } = useExamStore();

  useEffect(() => {
    if (isFinished || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(timeRemaining - 1);
      if (timeRemaining - 1 === 0) {
        finishExam();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isFinished, setTimeRemaining, finishExam]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const isWarning = timeRemaining < 300; // Less than 5 mins

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold font-mono text-lg transition-colors ${
      isWarning 
        ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" 
        : "bg-slate-800 text-slate-200 border border-slate-700 shadow-inner"
    }`}>
      <Clock className={`w-5 h-5 ${isWarning ? "text-red-400" : "text-cyan-400"}`} />
      <span>
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
}
