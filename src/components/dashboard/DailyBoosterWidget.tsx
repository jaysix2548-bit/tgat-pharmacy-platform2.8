"use client";

import React, { useEffect, useState } from "react";
import { useExamStore } from "@/store/examStore";
import { useRouter } from "next/navigation";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";
import { Flame, Sparkles, Trophy, CheckCircle, ChevronRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface AchievementItem {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const AchievementsList: AchievementItem[] = [
  { id: "streak_starter", name: "Streak Starter", description: "เริ่มสถิติการเรียนรู้ต่อเนื่อง 1 วัน", icon: "🔥" },
  { id: "streak_7days", name: "Consistent Champion", description: "เรียนรู้ครบถ้วนต่อเนื่อง 7 วัน", icon: "🛡️" },
  { id: "speed_demon", name: "Speed Demon", description: "ทำข้อสอบเร็วกว่าเวลาจำลองเฉลี่ย", icon: "⚡" },
  { id: "mistake_crusher", name: "Mistake Crusher", description: "ลบประเด็นตอบผิดออกได้ 5 ข้อ", icon: "📓" },
  { id: "mock_survivor", name: "Mock Survivor", description: "ลุยทำข้อสอบ Mock ครบ 200 ข้อ", icon: "👑" },
];

export default function DailyBoosterWidget() {
  const router = useRouter();
  const { 
    streakCount, 
    lastActiveDate, 
    unlockedAchievements, 
    mistakes, 
    incrementStreak, 
    setQuestions 
  } = useExamStore();
  
  const [mounted, setMounted] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);

  useEffect(() => {
    setMounted(true);
    incrementStreak(); // auto-check active streak when dashboard mounted

    // check if daily quest completed in localstorage
    const todayStr = new Date().toISOString().split('T')[0];
    const completed = localStorage.getItem(`daily_quest_${todayStr}`) === "true";
    setQuestCompleted(completed);
  }, [incrementStreak]);

  if (!mounted) {
    return (
      <div className="h-48 w-full bg-slate-900/40 border border-white/5 rounded-3xl animate-pulse" />
    );
  }

  // Find user's weakest topic
  const getWeakestTopic = () => {
    const list = Object.values(mistakes);
    if (list.length === 0) return { name: "Conversation & Dialogue", examId: "tgat1" as const };
    
    // Aggregate by topic
    const topicCounts: Record<string, { count: number; examId: "tgat1" | "tgat2" | "tgat3" }> = {};
    list.forEach((m) => {
      // Find full question topic details
      let q = TGAT1_QUESTIONS.find((x) => x.id === m.questionId) as import("@/types/exam").Question | undefined;
      if (!q) q = TGAT2_QUESTIONS.find((x) => x.id === m.questionId);
      if (!q) q = TGAT3_QUESTIONS.find((x) => x.id === m.questionId);
      
      if (q && (m.examId === "tgat1" || m.examId === "tgat2" || m.examId === "tgat3")) {
        if (!topicCounts[q.topic]) {
          topicCounts[q.topic] = { count: 0, examId: m.examId };
        }
        topicCounts[q.topic].count += m.attempts - m.correct;
      }
    });

    const sorted = Object.entries(topicCounts).sort((a, b) => b[1].count - a[1].count);
    if (sorted.length > 0) {
      return { name: sorted[0][0], examId: sorted[0][1].examId };
    }
    return { name: "Conversation & Dialogue", examId: "tgat1" as const };
  };

  const weakestTopic = getWeakestTopic();

  const handleStartDailyQuest = () => {
    // Collect 5 questions in the weakest topic
    let bank = TGAT1_QUESTIONS;
    if (weakestTopic.examId === "tgat2") bank = TGAT2_QUESTIONS;
    else if (weakestTopic.examId === "tgat3") bank = TGAT3_QUESTIONS;

    const filtered = bank.filter((q) => q.topic === weakestTopic.name);
    const questionsToSet = filtered.length >= 5 ? filtered.slice(0, 5) : bank.slice(0, 5);

    // Set state in store
    setQuestions(weakestTopic.examId, questionsToSet, "practice");
    
    // Mark quest completed for simulation and record in localstorage
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`daily_quest_${todayStr}`, "true");
    setQuestCompleted(true);

    router.push(`/${weakestTopic.examId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Daily Quest (Col span 2) */}
      <div className="md:col-span-2 saas-card flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-[50px] pointer-events-none rounded-full" />
        
        <div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-slate-300 text-xs font-medium">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400/10" /> Daily Weakness Booster
            </span>
            <div className="flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-orange-400 fill-orange-400/10" />
              <span className="text-sm font-semibold text-white">{streakCount} Days Streak</span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="heading-lg text-white leading-tight">
              ภารกิจพิชิตจุดอ่อนประจำวัน
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
              ท้าทายตนเองลุยโจทย์ Booster 5 ข้อ ในหัวข้อที่คุณมีอัตราตอบผิดสูงที่สุด เพื่อยืดรักษา Streak คะแนนสูงสุด
            </p>
          </div>

          {/* Dynamic Mission Card */}
          <div className="bg-slate-950/40 border border-white/5 p-5 rounded-2xl flex items-center justify-between gap-4 mt-6">
            <div>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider font-mono">
                Today&apos;s Target Topic
              </span>
              <h4 className="font-semibold text-blue-400 text-sm mt-1">
                {weakestTopic.name} ({weakestTopic.examId.toUpperCase()})
              </h4>
            </div>

            {questCompleted ? (
              <span className="text-xs font-medium text-green-400 flex items-center gap-1.5 bg-green-500/10 px-3.5 py-2 border border-green-500/20 rounded-xl">
                <CheckCircle className="w-4 h-4" /> ภารกิจสำเร็จแล้ว
              </span>
            ) : (
              <button
                onClick={handleStartDailyQuest}
                className="btn-primary"
              >
                ลุยเลย <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-500 mt-6 border-t border-white/5 pt-4">
          * ภารกิจรีเซ็ตอัตโนมัติทุกๆ 24 ชั่วโมง การเรียนรู้ต่อเนื่องสม่ำเสมอช่วยลดการหลงลืมคำศัพท์ได้กว่า 90%
        </div>
      </div>

      {/* Gamified Achievements (Col span 1) */}
      <div className="saas-card flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[45px] pointer-events-none rounded-full" />
        
        <div className="flex items-center gap-2 pb-4 border-b border-white/5">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white text-base">Achievements</h3>
          <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-md font-medium ml-auto">
            {unlockedAchievements.length} / {AchievementsList.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mt-4 max-h-[220px] pr-1">
          {AchievementsList.map((item) => {
            const isUnlocked = unlockedAchievements.includes(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all ${
                  isUnlocked
                    ? "bg-amber-400/5 border-amber-400/15 text-amber-400"
                    : "bg-white/5 border-white/5 text-slate-500 opacity-60"
                }`}
              >
                <div className="text-2xl select-none">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-xs text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed truncate">
                    {item.description}
                  </p>
                </div>
                {isUnlocked && (
                  <div className="ml-auto text-amber-400 flex-shrink-0">
                    <CheckCircle className="w-4 h-4 fill-amber-400/10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
