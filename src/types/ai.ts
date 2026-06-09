import type { ExamId, Difficulty } from "./exam";

export interface AIChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: number;
}

export interface AIWeaknessReport {
  topic: string;
  examId: ExamId;
  accuracy: number;
  attemptsCount: number;
  correctCount: number;
  mistakesCount: number;
  commonErrorPattern: string;
  remedialConcept: string;
}

export interface AIStudyRecommendation {
  topic: string;
  examId: ExamId;
  priority: "High" | "Medium" | "Low";
  targetStudyMinutes: number;
  dailyboosterQuest: string;
}

export interface AIGeneratedQuestion {
  id: string;
  difficulty: Difficulty;
  topic: string;
  examId: ExamId;
  text: string;
  options: string[];
  answer: number;
  correctExplanation: string;
  wrongExplanation: string;
  mindset: string;
  speedHack: string;
  userAnswer?: number;
  isCorrect?: boolean;
}

export interface AIStudyPlan {
  planId: string;
  duration: 7 | 14 | 30 | 60; // Added 60 days
  startDate: string;
  completedDays: Record<number, boolean>;
}
