"use client";

import React from "react";
import { motion } from "framer-motion";
import type { TopicScore } from "@/types/exam";

interface TopicBreakdownProps {
  topicScores: TopicScore[];
}

export default function TopicBreakdown({ topicScores }: TopicBreakdownProps) {
  return (
    <div className="space-y-5">
      {topicScores.map((ts, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-slate-200">{ts.topic}</span>
            <span className="text-slate-400 font-mono text-xs">
              {ts.correct}/{ts.total} (<span className={ts.percentage >= 70 ? "text-green-400" : ts.percentage < 50 ? "text-red-400" : "text-yellow-400"}>{ts.percentage}%</span>)
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ts.percentage}%` }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className={`h-full rounded-full ${
                ts.percentage >= 70 ? "bg-green-500" : 
                ts.percentage < 50 ? "bg-red-500" : "bg-yellow-500"
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
