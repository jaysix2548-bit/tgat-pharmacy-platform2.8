"use client";

import React from "react";
import { motion } from "framer-motion";

interface ProgressGraphProps {
  history: { attempt: number; score: number; percentage: number }[];
}

export default function ProgressGraph({ history }: ProgressGraphProps) {
  if (history.length < 2) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-3">
          📈
        </div>
        <p className="text-sm">กราฟพัฒนาการจะแสดงเมื่อคุณทำข้อสอบมากกว่า 1 ครั้ง</p>
      </div>
    );
  }

  // Find max for scaling
  const maxPct = 100;
  
  return (
    <div className="w-full h-48 flex items-end justify-between gap-2 pt-8">
      {history.slice(-10).map((h, i) => (
        <div key={i} className="flex flex-col items-center flex-1 group">
          <span className="text-xs font-bold text-slate-400 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {h.percentage}%
          </span>
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${(h.percentage / maxPct) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="w-full max-w-[40px] bg-gradient-to-t from-neon-blue/20 to-neon-blue rounded-t-lg relative"
          >
            {/* Dot at top */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#06b6d4]" />
          </motion.div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono uppercase">
            # {h.attempt}
          </span>
        </div>
      ))}
    </div>
  );
}
