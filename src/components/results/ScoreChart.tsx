"use client";

import React from "react";
import { motion } from "framer-motion";

interface ScoreChartProps {
  score: number;
  total: number;
  label?: string;
  colorClass?: string;
}

export default function ScoreChart({ score, total, label = "คะแนนที่ได้", colorClass = "from-neon-blue to-cyan-400" }: ScoreChartProps) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  
  // Circumference for SVG circle
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-3xl border border-white/10 shadow-xl relative">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Progress Circle */}
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            cx="70"
            cy="70"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]`}
          />
        </svg>
        
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white">{percentage}%</span>
          <span className="text-xs text-slate-400 font-medium mt-1">{score} / {total}</span>
        </div>
      </div>
      
      <div className="mt-4 text-slate-300 font-bold">{label}</div>
    </div>
  );
}
