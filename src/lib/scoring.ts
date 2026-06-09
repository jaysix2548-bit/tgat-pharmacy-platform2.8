import type { Question, TopicScore, DifficultyScore } from "@/types/exam";

export function calculateScore(questions: Question[], answers: Record<number, number>): number {
  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) score++;
  });
  return score;
}

export function getAccuracyByTopic(questions: Question[], answers: Record<number, number>): TopicScore[] {
  const topicMap: Record<string, { correct: number; total: number }> = {};

  questions.forEach((q, i) => {
    if (!topicMap[q.topic]) {
      topicMap[q.topic] = { correct: 0, total: 0 };
    }
    topicMap[q.topic].total++;
    if (answers[i] === q.answer) {
      topicMap[q.topic].correct++;
    }
  });

  return Object.keys(topicMap).map(topic => ({
    topic,
    correct: topicMap[topic].correct,
    total: topicMap[topic].total,
    percentage: Math.round((topicMap[topic].correct / topicMap[topic].total) * 100)
  })).sort((a, b) => b.percentage - a.percentage);
}

export function getAccuracyByDifficulty(questions: Question[], answers: Record<number, number>): DifficultyScore[] {
  const diffMap: Record<string, { correct: number; total: number }> = {
    Easy: { correct: 0, total: 0 },
    Medium: { correct: 0, total: 0 },
    Hard: { correct: 0, total: 0 },
    Elite: { correct: 0, total: 0 }
  };

  questions.forEach((q, i) => {
    diffMap[q.difficulty].total++;
    if (answers[i] === q.answer) {
      diffMap[q.difficulty].correct++;
    }
  });

  return Object.keys(diffMap).map(diff => ({
    difficulty: diff as import("@/types/exam").Difficulty,
    correct: diffMap[diff].correct,
    total: diffMap[diff].total,
    percentage: diffMap[diff].total > 0 ? Math.round((diffMap[diff].correct / diffMap[diff].total) * 100) : 0
  }));
}

export function getTimeAnalysis(questions: Question[], perQuestionTime: Record<number, number>) {
  let overTimeCount = 0;
  let totalTime = 0;
  let targetTotalTime = 0;

  questions.forEach((q, i) => {
    const timeSpent = perQuestionTime[i] || 0;
    totalTime += timeSpent;
    targetTotalTime += q.estimatedTime;
    
    if (timeSpent > q.estimatedTime) {
      overTimeCount++;
    }
  });

  return {
    overTimeCount,
    averageTimePerQuestion: Math.round(totalTime / questions.length),
    targetAverageTime: Math.round(targetTotalTime / questions.length),
    isFast: totalTime < targetTotalTime
  };
}
