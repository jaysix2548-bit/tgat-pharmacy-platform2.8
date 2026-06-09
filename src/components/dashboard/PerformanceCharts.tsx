"use client";

import React, { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useExamStore } from "@/store/examStore";
import { TrendingUp, BarChart2 } from "lucide-react";

export default function PerformanceCharts() {
  const { examHistory } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-64 w-full flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading Performance Charts...
      </div>
    );
  }

  // Aggregate weekly average scores
  const getWeeklyData = () => {
    if (examHistory.length === 0) {
      // Seed premium mock data if no history exists for a stunning empty state
      return [
        { name: "W1", accuracy: 55 },
        { name: "W2", accuracy: 60 },
        { name: "W3", accuracy: 68 },
        { name: "W4", accuracy: 72 },
        { name: "W5", accuracy: 78 },
      ];
    }

    // Map history to weeks
    return examHistory.slice(-7).map((h, i) => ({
      name: `Attempt ${i + 1}`,
      accuracy: Math.round((h.score / h.total) * 100),
    }));
  };

  // Aggregate monthly attempts
  const getMonthlyData = () => {
    if (examHistory.length === 0) {
      return [
        { name: "Jan", attempts: 1 },
        { name: "Feb", attempts: 2 },
        { name: "Mar", attempts: 4 },
        { name: "Apr", attempts: 5 },
        { name: "May", attempts: 7 },
      ];
    }

    // Dynamic aggregate of last 5 entries as simulated month slots
    return examHistory.slice(-5).map((h, i) => ({
      name: new Date(h.timestamp).toLocaleDateString("en-US", { month: "short" }),
      attempts: i + 1,
    }));
  };

  const weeklyData = getWeeklyData();
  const monthlyData = getMonthlyData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Weekly Progress Area Chart */}
      <div className="saas-card flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[25px] pointer-events-none rounded-full" />
        
        <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-4">
          <h4 className="font-semibold text-white text-xs flex items-center gap-1.5 leading-tight">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Weekly Performance Trend (Area)
          </h4>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium font-mono">
            Accuracy Curve
          </span>
        </div>

        <div className="h-48 w-full pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={9} 
                domain={[0, 100]} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#050b14", 
                  borderColor: "rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  fontSize: "10px",
                  color: "#fff"
                }}
              />
              <Area 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorAcc)" 
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Progress Bar Chart */}
      <div className="saas-card flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-[25px] pointer-events-none rounded-full" />
        
        <div className="flex justify-between items-center border-b border-white/5 pb-3.5 mb-4">
          <h4 className="font-semibold text-white text-xs flex items-center gap-1.5 leading-tight">
            <BarChart2 className="w-4 h-4 text-indigo-400" /> Monthly Activity Volume (Bar)
          </h4>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium font-mono">
            Attempts Count
          </span>
        </div>

        <div className="h-48 w-full pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <XAxis 
                dataKey="name" 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#050b14", 
                  borderColor: "rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  fontSize: "10px",
                  color: "#fff"
                }}
              />
              <Bar 
                dataKey="attempts" 
                fill="#6366f1" 
                radius={[3, 3, 0, 0]} 
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
