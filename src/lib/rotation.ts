import type { Question, ExamResult, MistakeEntry } from '@/types/exam';

/**
 * Selects and prioritizes questions for a new exam session based on:
 * 1. Unseen questions (Priority 1)
 * 2. Incorrect / weak questions (Priority 2)
 * 3. Old reviewed questions (Priority 3)
 * 4. Mastered questions (Priority 4)
 */
export function generateSmartQuestions(
  questions: Question[],
  history: ExamResult[],
  mistakes: Record<string, MistakeEntry> = {},
  limit: number = 60
): Question[] {
  // Collect all attempted question IDs from user's history
  const attemptedIds = new Set<string>();
  const lastAttemptedMap = new Map<string, number>();

  history.forEach((h) => {
    if (h.questionIds) {
      h.questionIds.forEach((id) => {
        attemptedIds.add(id);
        const prevTime = lastAttemptedMap.get(id) || 0;
        if (h.timestamp > prevTime) {
          lastAttemptedMap.set(id, h.timestamp);
        }
      });
    }
  });

  const unseen: Question[] = [];
  const incorrect: Question[] = [];
  const oldReviewed: Question[] = [];
  const mastered: Question[] = [];

  questions.forEach((q) => {
    const isAttempted = attemptedIds.has(q.id);
    const mistake = mistakes[q.id];
    const isMistake = !!mistake;
    const isMastered = mistake ? mistake.correct > 0 : false;

    if (!isAttempted && !isMistake) {
      unseen.push(q);
    } else if (isMistake && !isMastered) {
      incorrect.push(q);
    } else if (isAttempted && (!isMistake || isMastered)) {
      // If it's mastered or just attempted successfully without mistakes
      if (isMastered) {
        mastered.push(q);
      } else {
        oldReviewed.push(q);
      }
    } else {
      oldReviewed.push(q);
    }
  });

  // Fisher-Yates shuffle helper
  const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // 1. Shuffle Tier 1 (Unseen)
  const shuffledUnseen = shuffle(unseen);

  // 2. Sort/Shuffle Tier 2 (Incorrect) - we can shuffle them to keep it dynamic
  const shuffledIncorrect = shuffle(incorrect);

  // 3. Sort Tier 3 (Old Reviewed) - older attempts first (lastAttemptedAt ascending)
  const sortedOldReviewed = [...oldReviewed].sort((a, b) => {
    const timeA = lastAttemptedMap.get(a.id) || 0;
    const timeB = lastAttemptedMap.get(b.id) || 0;
    return timeA - timeB;
  });

  // 4. Shuffle Tier 4 (Mastered)
  const shuffledMastered = shuffle(mastered);

  // Combine by priority order
  const orderedPool = [
    ...shuffledUnseen,
    ...shuffledIncorrect,
    ...sortedOldReviewed,
    ...shuffledMastered,
  ];

  // Fallback check: if somehow we don't have enough questions at all
  if (orderedPool.length === 0) {
    return questions.slice(0, limit);
  }

  return orderedPool.slice(0, limit);
}
