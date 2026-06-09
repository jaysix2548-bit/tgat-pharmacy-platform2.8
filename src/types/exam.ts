// ===== Difficulty & Frequency Enums =====
export type Difficulty = "Easy" | "Medium" | "Hard" | "Elite";
export type Frequency = "Low" | "Medium" | "High" | "Very High";
export type ExamId = "tgat1" | "tgat2" | "tgat3";
export type ExamMode = "practice" | "exam";

// ===== Question Types =====
export interface BaseQuestion {
  id: string;
  difficulty: Difficulty;
  topic: string;
  section: string;
  partTitle: string;
  suggestedTime: string;
  estimatedTime: number;        // seconds, e.g. 45
  frequency: Frequency;
  examWeight: number;           // 1-10
  yearPattern: string;          // e.g. "2566-2567"
  text: string;
  passage?: string | null;
  options: string[];
  answer: number;
  correctExplanation: string;
  wrongExplanation: string;
  mindset: string;
  speedHack: string;
  isUsed?: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
  examCategory?: string;
}

export type TGAT1Question = BaseQuestion;

export interface TGAT2Question extends BaseQuestion {
  subtopic: string;             // e.g. "Quantifier Logic", "Set Theory"
  reasoningType?: string;       // "Numerical" | "Logical" | "Spatial" | "Analytical" | "Speed"
}

export interface TGAT3Question extends BaseQuestion {
  competency: string;           // e.g. "Ethics", "Communication", "Teamwork", "Emotional Intelligence"
}

export type Question = TGAT1Question | TGAT2Question | TGAT3Question;

// ===== Exam Result & History =====
export interface ExamResult {
  examId: ExamId;
  score: number;
  total: number;
  answers: Record<number, number>;
  timestamp: number;            // Date.now()
  timeSpent: number;            // total seconds spent
  perQuestionTime: Record<number, number>; // seconds per question index
  mode: ExamMode;
  questionIds?: string[];       // stores the exact shuffled order of question IDs
}

export interface TopicScore {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface DifficultyScore {
  difficulty: Difficulty;
  correct: number;
  total: number;
  percentage: number;
}

// ===== Mistake Notebook =====
export interface MistakeEntry {
  questionId: string;
  examId: ExamId;
  date: string;                 // ISO date string
  attempts: number;
  correct: number;
  nextReviewDate?: string;      // ISO string for Spaced Repetition due date
  intervalDays?: number;        // Spaced Repetition interval (days)
  easeFactor?: number;          // Spaced Repetition ease factor
  spacedStep?: number;          // Step count in SM-2 Spaced Repetition
}

// ===== Search & Filter =====
export interface SearchFilters {
  topic?: string;
  difficulty?: Difficulty;
  competency?: string;
  section?: string;
  frequency?: Frequency;
  keyword?: string;
}

// ===== Study Content =====
export interface StudyChapter {
  id: string;
  examId: ExamId;
  title: string;
  content: string;
  examples: string[];
  mindsetTips: string[];
  miniQuizIds: string[];        // question IDs for mini quiz
}

// ===== Exam Store State =====
export interface ExamState {
  // --- User Authentication State ---
  user: {
    userId: string;
    username: string;
    displayName: string;
    role: string;
  } | null;

  // --- Current exam session ---
  examId: ExamId;
  examMode: ExamMode;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, number>;
  flags: Record<number, boolean>;          // 🚩 per-session flags (reset on new exam)
  timeRemaining: number;
  isFinished: boolean;
  score: number;

  // --- Per-question timing ---
  questionStartTime: number;
  perQuestionTime: Record<number, number>;

  // --- Bookmark (⭐ persistent across sessions) ---
  bookmarkedQuestions: string[];           // question IDs

  // --- History ---
  examHistory: ExamResult[];

  // --- Mistake Notebook ---
  mistakes: Record<string, MistakeEntry>; // keyed by questionId

  // --- Spaced Repetition & Streaks ---
  streakCount: number;
  lastActiveDate: string;                  // YYYY-MM-DD
  unlockedAchievements: string[];          // achievement keys

  // --- Adaptive Study Plans ---
  studyPlans: Record<string, {
    type: 7 | 14 | 30 | 60;
    startDate: string;
    completedDays: Record<number, boolean>;
  }>;

  // --- Full Mock Exam session ---
  mockSession: {
    questions: Question[];
    currentQuestionIndex: number;
    answers: Record<number, number>;
    flags: Record<number, boolean>;
    timeRemaining: number;
    isFinished: boolean;
    score: number;
    perQuestionTime: Record<number, number>;
    startTime: number;
  } | null;

  // --- Actions: Authentication & Sync ---
  syncUserData: () => Promise<boolean>;
  loginUser: (user: { userId: string; username: string; displayName: string; role: string }) => Promise<void>;
  logoutUser: () => Promise<void>;

  // --- Actions: Exam lifecycle ---
  setQuestions: (examId: ExamId, questions: Question[], mode?: ExamMode) => void;
  setAnswer: (index: number, answerIndex: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setTimeRemaining: (time: number) => void;
  finishExam: () => void;
  resetExam: () => void;

  // --- Actions: Flag & Bookmark ---
  toggleFlag: (index: number) => void;
  toggleBookmark: (questionId: string) => void;
  isBookmarked: (questionId: string) => boolean;

  // --- Actions: Timing ---
  startQuestionTimer: () => void;
  recordQuestionTime: (index: number) => void;

  // --- Actions: History ---
  saveResult: () => void;
  getHistory: (examId?: ExamId) => ExamResult[];

  // --- Actions: Mistakes ---
  recordMistake: (questionId: string, examId: ExamId) => void;
  getMistakes: (examId?: ExamId) => MistakeEntry[];
  clearMistake: (questionId: string) => void;

  // --- Actions: Spaced Repetition & Streaks ---
  incrementStreak: () => void;
  unlockAchievement: (id: string) => void;
  updateMistakeReview: (questionId: string, easeFactor: number, intervalDays: number, spacedStep: number, nextReviewDate: string) => void;

  // --- Actions: Study Plans ---
  startStudyPlan: (planId: string, duration: 7 | 14 | 30 | 60) => void;
  toggleStudyPlanDay: (planId: string, day: number) => void;

  // --- Actions: Mock Exam ---
  startMockExam: (questions: Question[]) => void;
  setMockAnswer: (index: number, answerIndex: number) => void;
  toggleMockFlag: (index: number) => void;
  goToMockQuestion: (index: number) => void;
  setMockTimeRemaining: (time: number) => void;
  finishMockExam: () => void;
  resetMockExam: () => void;
  saveMockResult: () => void;
}

