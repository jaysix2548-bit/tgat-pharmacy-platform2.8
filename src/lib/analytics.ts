import type { ExamResult } from "@/types/exam";

export function getProgressTrend(history: ExamResult[]): { attempt: number; score: number; percentage: number }[] {
  return history.map((h, i) => ({
    attempt: i + 1,
    score: h.score,
    percentage: Math.round((h.score / h.total) * 100)
  }));
}

export function getWeakTopicsFromHistory(_history: ExamResult[], _allQuestions: import("@/types/exam").Question[]): string[] {
  return ["Logical Reasoning", "Spatial Reasoning"]; // Mocked for now due to complex state mapping
}

export function getReadinessLevel(percentage: number): "ยังต้องฝึก" | "พอใช้" | "ดี" | "พร้อมสอบ" {
  if (percentage >= 80) return "พร้อมสอบ";
  if (percentage >= 60) return "ดี";
  if (percentage >= 40) return "พอใช้";
  return "ยังต้องฝึก";
}
