/**
 * Spaced Repetition SuperMemo-2 (SM-2) algorithm implementation.
 * 
 * Quality ratings scale:
 * 5 - Perfect response (Easy recall)
 * 4 - Correct response after a hesitation (Medium recall)
 * 3 - Correct response with serious difficulty (Hard recall)
 * 2 - Incorrect response; where the correct one seemed easy to recall
 * 1 - Incorrect response; the correct one remembered
 * 0 - Complete blackout
 */
export interface SM2Result {
  intervalDays: number;
  easeFactor: number;
  spacedStep: number;
  nextReviewDate: string; // ISO date string
}

export function calculateSM2(
  quality: number,
  prevInterval = 0,
  prevEaseFactor = 2.5,
  prevSpacedStep = 0
): SM2Result {
  let intervalDays = 1;
  let easeFactor = prevEaseFactor;
  let spacedStep = prevSpacedStep;

  // Validate quality bounds [0, 5]
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  if (q >= 3) {
    // Correct recall
    if (spacedStep === 0) {
      intervalDays = 1; // Day 1
    } else if (spacedStep === 1) {
      intervalDays = 3; // Day 3 (optimized for student prep)
    } else {
      intervalDays = Math.max(1, Math.round(prevInterval * easeFactor));
    }
    spacedStep += 1;
  } else {
    // Incorrect recall (reset step, set interval to 1 day)
    intervalDays = 1;
    spacedStep = 0;
  }

  // Adjust Ease Factor (EF)
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = Math.max(1.3, easeFactor); // 1.3 is the minimum EF limit in standard SM-2

  // Calculate Next Review Date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  
  // Return YYYY-MM-DD format (easier to read and compare)
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  return {
    intervalDays,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    spacedStep,
    nextReviewDate,
  };
}

/**
 * Checks if a mistake entry is due for review today or overdue.
 */
export function isMistakeDue(nextReviewDateStr?: string): boolean {
  if (!nextReviewDateStr) return true; // not reviewed yet, so it is due
  
  const todayStr = new Date().toISOString().split('T')[0];
  return nextReviewDateStr <= todayStr;
}
