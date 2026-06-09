"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { useRouter } from "next/navigation";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";
import { Grid, Sparkles, BookOpen, ChevronRight, Activity, Award } from "lucide-react";
import { motion } from "framer-motion";

interface HeatmapTopic {
  id: string;
  name: string;
  examId: "tgat1" | "tgat2" | "tgat3";
  description: string;
}

const Blueprints: HeatmapTopic[] = [
  // TGAT1
  { id: "T1-CV", name: "Conversation & Dialogue", examId: "tgat1", description: "ทักษะการสื่อสารในสถานการณ์ต่างๆ" },
  { id: "T1-VC", name: "Vocabulary & Context Clues", examId: "tgat1", description: "คำศัพท์และคำเหมือนในบริบทสาธารณสุข" },
  { id: "T1-RD", name: "Reading Comprehension", examId: "tgat1", description: "การอ่านทำความเข้าใจและตีความบทความ" },
  
  // TGAT2
  { id: "T2-NM", name: "Numerical Reasoning", examId: "tgat2", description: "อนุกรมคณิตศาสตร์และการแปรผลข้อมูล" },
  { id: "T2-LG", name: "Logical Reasoning", examId: "tgat2", description: "การคิดเชิงตรรกะ ตาราง ตรรกศาสตร์มิติ" },
  { id: "T2-SP", name: "Spatial Reasoning", examId: "tgat2", description: "มิติสัมพันธ์ พับกล่อง หมุนรูปภาพรูปทรง" },
  
  // TGAT3
  { id: "T3-ET", name: "Ethics & Integrity", examId: "tgat3", description: "จริยธรรมการทำงานและจิตวิญญาณบริการ" },
  { id: "T3-CM", name: "Communication & Collaboration", examId: "tgat3", description: "การสื่อสารร่วมกับเพื่อนร่วมงานและคนไข้" },
  { id: "T3-TM", name: "Teamwork & Synergy", examId: "tgat3", description: "การทำงานร่วมกัน ความคิดสร้างสรรค์ในองค์กร" },
];

export default function WeaknessHeatmap() {
  const router = useRouter();
  const { mistakes, examHistory, setQuestions } = useExamStore();
  const [mounted, setMounted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HeatmapTopic | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-48 w-full flex items-center justify-center text-slate-500 font-mono text-xs">
        Loading Weakness Heatmap...
      </div>
    );
  }

  // Calculate mastery percentage for a blueprint topic
  const getTopicMastery = (topicName: string, examId: string) => {
    // 1. Gather historical attempts
    const history = examHistory.filter((h) => h.examId === examId);
    
    // Look at mistakes count for this topic
    const topicMistakesCount = Object.values(mistakes).filter(
      (m) => m.examId === examId && m.attempts > m.correct
    ).length;

    if (history.length === 0) {
      // baseline default based on mistakes notebook
      if (topicMistakesCount > 2) return 35; // Weak
      if (topicMistakesCount > 0) return 60; // Medium
      return 85; // Strong
    }

    // Aggregate average accuracy
    const totalCorrect = history.reduce((acc, h) => acc + h.score, 0);
    const totalQuestions = history.reduce((acc, h) => acc + h.total, 0);
    
    const basePct = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 80;
    
    // deduct based on active mistakes
    const adjustedPct = Math.max(10, Math.round(basePct - topicMistakesCount * 8));
    return adjustedPct;
  };

  const handleLaunchPractice = (topic: HeatmapTopic) => {
    // Collect questions matching this exact topic from appropriate question banks
    let bank = TGAT1_QUESTIONS;
    if (topic.examId === "tgat2") bank = TGAT2_QUESTIONS;
    else if (topic.examId === "tgat3") bank = TGAT3_QUESTIONS;

    const filtered = bank.filter((q) => q.topic.toLowerCase().includes(topic.name.split(" ")[0].toLowerCase()) || q.topic === topic.name);
    
    if (filtered.length > 0) {
      setQuestions(topic.examId, filtered, "practice");
      router.push(`/${topic.examId}`);
    } else {
      // Fallback to complete set if topic filter matches nothing (safeguard)
      setQuestions(topic.examId, bank, "practice");
      router.push(`/${topic.examId}`);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mb-3 text-xs font-bold">
            <Grid className="w-4 h-4" /> Syllabus Mastery Heatmap
          </div>
          <h3 className="text-2xl font-black text-white leading-tight">
            แผนผังวิเคราะห์จุดอ่อนรายหัวข้อ
          </h3>
          <p className="text-slate-300 text-sm mt-1 font-medium">
            ระบายสีตามระดับความแม่นยำและการทำผิดในอดีต (คลิกกล่องหัวข้อเพื่อลุยโจทย์ Booster)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-red-500/20 border border-red-500 rounded-md shadow-[0_0_5px_rgba(239,68,68,0.3)]" />
            <span>Weak (&lt;45%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-amber-500/20 border border-amber-500 rounded-md shadow-[0_0_5px_rgba(245,158,11,0.3)]" />
            <span>Warning (45-70%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-cyan-500/20 border border-cyan-500 rounded-md shadow-[0_0_5px_rgba(6,182,212,0.3)]" />
            <span>Strong (&gt;70%)</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Blueprints.map((topic) => {
          const mastery = getTopicMastery(topic.name, topic.examId);
          
          let cardStyle = "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.05)]";
          let label = "Stable";
          
          if (mastery < 45) {
            cardStyle = "bg-red-500/10 border-red-500/30 hover:border-red-400 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]";
            label = "Critical Weakness";
          } else if (mastery <= 70) {
            cardStyle = "bg-amber-500/10 border-amber-500/30 hover:border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)]";
            label = "Medium Risk";
          }

          return (
            <motion.div
              key={topic.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedTopic(topic)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[135px] relative overflow-hidden group ${cardStyle}`}
            >
              {/* Exam badge */}
              <span className="absolute top-3 right-3 text-[11px] uppercase font-mono font-black border border-current px-2.5 py-0.5 rounded-full select-none bg-slate-950/30">
                {topic.examId}
              </span>

              <div>
                <h4 className="font-black text-white text-base group-hover:underline leading-tight pr-12">
                  {topic.name}
                </h4>
                <p className="text-xs text-slate-200 mt-2 leading-relaxed font-medium">
                  {topic.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  {label}
                </span>
                <span className="text-xl font-black font-mono">
                  {mastery}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic Drawer overlay when topic selected */}
      {selectedTopic && (
        <div className="bg-slate-950/80 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 animate-fade-in shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-blue/5 blur-[40px] pointer-events-none rounded-full" />
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-300">
              {selectedTopic.examId === "tgat1" ? (
                <BookOpen className="w-6 h-6 text-cyan-400" />
              ) : selectedTopic.examId === "tgat2" ? (
                <Activity className="w-6 h-6 text-pink-400" />
              ) : (
                <Award className="w-6 h-6 text-orange-400" />
              )}
            </div>
            <div>
              <h4 className="font-black text-white text-base flex items-center gap-1.5">
                Ready to drill {selectedTopic.name}? <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed mt-1 font-medium">
                ระบบจัดเตรียม Weakness Booster Pack จำนวน 5-10 ข้อ สำหรับหัวข้อนี้โดยเฉพาะ เพื่อช่วยปรับความแม่นยำของคุณ
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTopic(null)}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-white/5 transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => handleLaunchPractice(selectedTopic)}
              className="px-5 py-2.5 bg-neon-blue hover:bg-cyan-400 text-black rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all active:scale-95"
            >
              Start Weakness Booster <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
