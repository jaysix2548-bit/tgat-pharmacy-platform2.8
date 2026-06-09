import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExamState, ExamId, ExamResult, Question } from '@/types/exam';
import { generateSmartQuestions } from '@/lib/rotation';

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      // --- User Authentication State ---
      user: null,

      // --- Current session state ---
      examId: 'tgat1',
      examMode: 'practice',
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      flags: {},
      timeRemaining: 3600,
      isFinished: false,
      score: 0,

      // --- Per-question timing ---
      questionStartTime: 0,
      perQuestionTime: {},

      // --- Bookmark & History & Mistakes (Persistent) ---
      bookmarkedQuestions: [],
      examHistory: [],
      mistakes: {},

      // --- Spaced Repetition & Streaks (Persistent) ---
      streakCount: 0,
      lastActiveDate: '',
      unlockedAchievements: [],

      // --- Adaptive Study Plans (Persistent) ---
      studyPlans: {},

      // --- Full Mock Exam session (Persistent) ---
      mockSession: null,

      // --- Actions: Authentication & Sync ---
      syncUserData: async () => {
        try {
          const res = await fetch('/api/auth/sync-user-data');
          const data = await res.json();
          if (data.success && data.data) {
            set({
              examHistory: data.data.examHistory || [],
              mistakes: data.data.mistakes || {},
              streakCount: data.data.streakCount || 0,
            });
            const user = get().user;
            if (user && data.data.displayName) {
              set({
                user: {
                  ...user,
                  displayName: data.data.displayName,
                },
              });
            }
            return true;
          }
          return false;
        } catch (error) {
          console.error('Error syncing user data:', error);
          return false;
        }
      },

      loginUser: async (user) => {
        set({ user });
        await get().syncUserData();
      },

      logoutUser: async () => {
        try {
          await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({
          user: null,
          examHistory: [],
          mistakes: {},
          streakCount: 0,
        });
      },

      // --- Actions: Exam lifecycle ---
      setQuestions: (examId, questions, mode = 'practice') => {
        let finalQuestions = questions;
        const user = get().user;

        if (user) {
          const limit = examId === 'tgat2' ? 80 : 60;
          finalQuestions = generateSmartQuestions(questions, get().examHistory, get().mistakes, limit);
        } else {
          // Shuffle questions (Fisher-Yates) for guest users
          const shuffledQuestions = [...questions];
          for (let i = shuffledQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
          }
          finalQuestions = shuffledQuestions;
        }

        set({
          examId,
          examMode: mode,
          questions: finalQuestions,
          currentQuestionIndex: 0,
          answers: {},
          flags: {},
          timeRemaining: examId === 'tgat2' ? 4500 : 3600,
          isFinished: false,
          score: 0,
          questionStartTime: Date.now(),
          perQuestionTime: {},
        });
      },

      setAnswer: (index, answerIndex) => {
        const state = get();
        // Record time spent on current question before updating
        state.recordQuestionTime(index);

        set((state) => ({
          answers: { ...state.answers, [index]: answerIndex },
        }));
      },

      nextQuestion: () => {
        const state = get();
        const currentIdx = state.currentQuestionIndex;
        state.recordQuestionTime(currentIdx);

        if (currentIdx < state.questions.length - 1) {
          set({
            currentQuestionIndex: currentIdx + 1,
            questionStartTime: Date.now(),
          });
        }
      },

      prevQuestion: () => {
        const state = get();
        const currentIdx = state.currentQuestionIndex;
        state.recordQuestionTime(currentIdx);

        if (currentIdx > 0) {
          set({
            currentQuestionIndex: currentIdx - 1,
            questionStartTime: Date.now(),
          });
        }
      },

      goToQuestion: (index) => {
        const state = get();
        state.recordQuestionTime(state.currentQuestionIndex);
        set({
          currentQuestionIndex: index,
          questionStartTime: Date.now(),
        });
      },

      setTimeRemaining: (timeRemaining) => set({ timeRemaining }),

      finishExam: () => {
        const state = get();
        if (state.isFinished) return;

        // Record time for the final question
        state.recordQuestionTime(state.currentQuestionIndex);

        let finalScore = 0;
        state.questions.forEach((q, i) => {
          if (state.answers[i] === q.answer) {
            finalScore++;
          } else {
            // Record as a mistake
            state.recordMistake(q.id, state.examId);
          }
        });

        set({
          isFinished: true,
          score: finalScore,
        });

        // Save result to persistent history
        get().saveResult();
      },

      resetExam: () => {
        const state = get();
        set({
          currentQuestionIndex: 0,
          answers: {},
          flags: {},
          timeRemaining: state.examId === 'tgat2' ? 4500 : 3600,
          isFinished: false,
          score: 0,
          questionStartTime: Date.now(),
          perQuestionTime: {},
        });
      },

      // --- Actions: Flag & Bookmark ---
      toggleFlag: (index) => {
        set((state) => ({
          flags: { ...state.flags, [index]: !state.flags[index] },
        }));
      },

      toggleBookmark: (questionId) => {
        set((state) => {
          const exists = state.bookmarkedQuestions.includes(questionId);
          const newBookmarks = exists
            ? state.bookmarkedQuestions.filter((id) => id !== questionId)
            : [...state.bookmarkedQuestions, questionId];
          return { bookmarkedQuestions: newBookmarks };
        });
      },

      isBookmarked: (questionId) => {
        return get().bookmarkedQuestions.includes(questionId);
      },

      // --- Actions: Timing ---
      startQuestionTimer: () => {
        set({ questionStartTime: Date.now() });
      },

      recordQuestionTime: (index) => {
        const startTime = get().questionStartTime;
        if (startTime === 0) return;

        const timeSpent = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        set((state) => {
          const currentRecorded = state.perQuestionTime[index] || 0;
          return {
            perQuestionTime: {
              ...state.perQuestionTime,
              [index]: currentRecorded + timeSpent,
            },
            questionStartTime: Date.now(), // reset start time for continuation
          };
        });
      },

      // --- Actions: History ---
      saveResult: () => {
        const state = get();
        // Calculate total time spent
        const totalTimeAllowed = state.examId === 'tgat2' ? 4500 : 3600;
        const timeSpent = Math.max(0, totalTimeAllowed - state.timeRemaining);

        const newResult: ExamResult = {
          examId: state.examId,
          score: state.score,
          total: state.questions.length,
          answers: { ...state.answers },
          timestamp: Date.now(),
          timeSpent,
          perQuestionTime: { ...state.perQuestionTime },
          mode: state.examMode,
          questionIds: state.questions.map(q => q.id),
        };

        set((state) => ({
          examHistory: [...state.examHistory, newResult],
        }));

        if (state.user) {
          const attempts = state.questions.map((q, i) => {
            const selected = state.answers[i];
            return {
              questionId: q.id,
              selectedAnswer: selected !== undefined ? selected : null,
              correctAnswer: q.answer,
              isCorrect: selected === q.answer,
              timeSpent: state.perQuestionTime[i] || 0,
            };
          });

          fetch('/api/questions/update-usage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: state.user.userId,
              displayName: state.user.displayName,
              examType: state.examId.toUpperCase(),
              attempts,
              score: state.score,
              total: state.questions.length,
              timeSpent,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                console.log('Successfully synced results to Google Sheets.');
                get().syncUserData();
              } else {
                console.error('Failed to sync results:', data.error);
              }
            })
            .catch((err) => {
              console.error('Error syncing results:', err);
            });
        }
      },

      getHistory: (examId) => {
        const history = get().examHistory;
        if (!examId) return history;
        return history.filter((h) => h.examId === examId);
      },

      // --- Actions: Mistakes ---
      recordMistake: (questionId, examId) => {
        set((state) => {
          const currentMistakes = { ...state.mistakes };
          if (currentMistakes[questionId]) {
            currentMistakes[questionId] = {
              ...currentMistakes[questionId],
              attempts: currentMistakes[questionId].attempts + 1,
              date: new Date().toISOString(),
            };
          } else {
            currentMistakes[questionId] = {
              questionId,
              examId,
              date: new Date().toISOString(),
              attempts: 1,
              correct: 0,
            };
          }
          return { mistakes: currentMistakes };
        });
      },

      getMistakes: (examId) => {
        const mistakesObj = get().mistakes;
        const list = Object.values(mistakesObj);
        if (!examId) return list;
        return list.filter((m) => m.examId === examId);
      },

      clearMistake: (questionId) => {
        set((state) => {
          const currentMistakes = { ...state.mistakes };
          delete currentMistakes[questionId];
          return { mistakes: currentMistakes };
        });
      },

      // --- Actions: Spaced Repetition & Streaks ---
      incrementStreak: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastActive = get().lastActiveDate;

        if (lastActive === todayStr) return; // already active today

        set((state) => {
          let newStreak = state.streakCount;
          
          if (!lastActive) {
            newStreak = 1;
          } else {
            const lastActiveDate = new Date(lastActive);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              newStreak += 1;
            } else if (diffDays > 1) {
              newStreak = 1; // streak broken, reset to 1
            }
          }

          // Trigger achievements check
          const achievements = [...state.unlockedAchievements];
          if (newStreak === 1 && !achievements.includes('streak_starter')) {
            achievements.push('streak_starter');
          }
          if (newStreak === 7 && !achievements.includes('streak_7days')) {
            achievements.push('streak_7days');
          }

          return {
            streakCount: newStreak,
            lastActiveDate: todayStr,
            unlockedAchievements: achievements,
          };
        });
      },

      unlockAchievement: (id) => {
        set((state) => {
          if (state.unlockedAchievements.includes(id)) return {};
          return {
            unlockedAchievements: [...state.unlockedAchievements, id],
          };
        });
      },

      updateMistakeReview: (questionId, easeFactor, intervalDays, spacedStep, nextReviewDate) => {
        set((state) => {
          const currentMistakes = { ...state.mistakes };
          if (currentMistakes[questionId]) {
            currentMistakes[questionId] = {
              ...currentMistakes[questionId],
              correct: currentMistakes[questionId].correct + 1,
              attempts: currentMistakes[questionId].attempts + 1,
              easeFactor,
              intervalDays,
              spacedStep,
              nextReviewDate,
              date: new Date().toISOString(),
            };
          }
          return { mistakes: currentMistakes };
        });
      },

      // --- Actions: Study Plans ---
      startStudyPlan: (planId, duration) => {
        set((state) => ({
          studyPlans: {
            ...state.studyPlans,
            [planId]: {
              type: duration,
              startDate: new Date().toISOString().split('T')[0],
              completedDays: {},
            },
          },
        }));
      },

      toggleStudyPlanDay: (planId, day) => {
        set((state) => {
          const currentPlans = { ...state.studyPlans };
          if (currentPlans[planId]) {
            const completed = { ...currentPlans[planId].completedDays };
            completed[day] = !completed[day];
            currentPlans[planId] = {
              ...currentPlans[planId],
              completedDays: completed,
            };
          }
          return { studyPlans: currentPlans };
        });
      },

      // --- Actions: Mock Exam ---
      startMockExam: (questions) => {
        const t1Pool = questions.filter(q => !q.id.startsWith('T2-') && !q.id.startsWith('T3-'));
        const t2Pool = questions.filter(q => q.id.startsWith('T2-'));
        const t3Pool = questions.filter(q => q.id.startsWith('T3-'));

        const user = get().user;
        let t1Selected, t2Selected, t3Selected;

        if (user) {
          t1Selected = generateSmartQuestions(t1Pool, get().examHistory, get().mistakes, 60);
          t2Selected = generateSmartQuestions(t2Pool, get().examHistory, get().mistakes, 80);
          t3Selected = generateSmartQuestions(t3Pool, get().examHistory, get().mistakes, 60);
        } else {
          // Shuffle and slice for guests
          const shuffle = (arr: Question[]) => {
            const temp = [...arr];
            for (let i = temp.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [temp[i], temp[j]] = [temp[j], temp[i]];
            }
            return temp;
          };
          t1Selected = shuffle(t1Pool).slice(0, 60);
          t2Selected = shuffle(t2Pool).slice(0, 80);
          t3Selected = shuffle(t3Pool).slice(0, 60);
        }

        const selected = [...t1Selected, ...t2Selected, ...t3Selected];

        set({
          mockSession: {
            questions: selected,
            currentQuestionIndex: 0,
            answers: {},
            flags: {},
            timeRemaining: 10800, // 3 hours (180 mins)
            isFinished: false,
            score: 0,
            perQuestionTime: {},
            startTime: Date.now(),
          },
        });
      },

      setMockAnswer: (index, answerIndex) => {
        set((state) => {
          if (!state.mockSession) return {};
          const session = { ...state.mockSession };
          session.answers = { ...session.answers, [index]: answerIndex };
          return { mockSession: session };
        });
      },

      toggleMockFlag: (index) => {
        set((state) => {
          if (!state.mockSession) return {};
          const session = { ...state.mockSession };
          session.flags = { ...session.flags, [index]: !session.flags[index] };
          return { mockSession: session };
        });
      },

      goToMockQuestion: (index) => {
        set((state) => {
          if (!state.mockSession) return {};
          const session = { ...state.mockSession };
          session.currentQuestionIndex = index;
          return { mockSession: session };
        });
      },

      setMockTimeRemaining: (time) => {
        set((state) => {
          if (!state.mockSession) return {};
          const session = { ...state.mockSession };
          session.timeRemaining = time;
          return { mockSession: session };
        });
      },

      finishMockExam: () => {
        const state = get();
        if (!state.mockSession || state.mockSession.isFinished) return;

        const session = { ...state.mockSession };
        let finalScore = 0;

        session.questions.forEach((q, i) => {
          if (session.answers[i] === q.answer) {
            finalScore++;
          } else {
            // Also log mistakes to mistakes notebook
            // Find appropriate Exam ID for question
            let examId: ExamId = 'tgat1';
            if (q.id.startsWith('T2-')) examId = 'tgat2';
            else if (q.id.startsWith('T3-')) examId = 'tgat3';

            state.recordMistake(q.id, examId);
          }
        });

        session.isFinished = true;
        session.score = finalScore;

        set({ mockSession: session });

        // Save mock result to history
        get().saveMockResult();

        // Unlock achievement for mock completion
        get().unlockAchievement('mock_survivor');
      },

      resetMockExam: () => {
        set((state) => {
          if (!state.mockSession) return {};
          const session = { ...state.mockSession };
          session.currentQuestionIndex = 0;
          session.answers = {};
          session.flags = {};
          session.timeRemaining = 10800;
          session.isFinished = false;
          session.score = 0;
          session.perQuestionTime = {};
          session.startTime = Date.now();
          return { mockSession: session };
        });
      },

      saveMockResult: () => {
        const state = get();
        if (!state.mockSession) return;

        const session = state.mockSession;
        const totalTimeSpent = 10800 - session.timeRemaining;

        const newResult: ExamResult = {
          examId: 'tgat1', // Store under tgat1 but with "combined" tag inside metadata or identified by total questions = 200
          score: session.score,
          total: session.questions.length,
          answers: { ...session.answers },
          timestamp: Date.now(),
          timeSpent: totalTimeSpent,
          perQuestionTime: { ...session.perQuestionTime },
          mode: 'exam',
          questionIds: session.questions.map(q => q.id),
        };

        // Let's store combined mock exams in history as well
        set((state) => ({
          examHistory: [...state.examHistory, newResult],
        }));

        if (state.user) {
          // A mock exam contains a mix of TGAT1, TGAT2, TGAT3 questions.
          // Split them and post to /api/questions/update-usage.
          const tgat1Attempts: any[] = [];
          const tgat2Attempts: any[] = [];
          const tgat3Attempts: any[] = [];

          let t1Score = 0, t1Total = 0, t1Time = 0;
          let t2Score = 0, t2Total = 0, t2Time = 0;
          let t3Score = 0, t3Total = 0, t3Time = 0;

          session.questions.forEach((q, i) => {
            const selected = session.answers[i];
            const isCorrect = selected === q.answer;
            const qTime = session.perQuestionTime[i] || 0;
            const attempt = {
              questionId: q.id,
              selectedAnswer: selected !== undefined ? selected : null,
              correctAnswer: q.answer,
              isCorrect,
              timeSpent: qTime,
            };

            if (q.id.startsWith('T2-')) {
              tgat2Attempts.push(attempt);
              t2Total++;
              if (isCorrect) t2Score++;
              t2Time += qTime;
            } else if (q.id.startsWith('T3-')) {
              tgat3Attempts.push(attempt);
              t3Total++;
              if (isCorrect) t3Score++;
              t3Time += qTime;
            } else {
              tgat1Attempts.push(attempt);
              t1Total++;
              if (isCorrect) t1Score++;
              t1Time += qTime;
            }
          });

          // Helper to send individual updates
          const sendUpdate = (examType: string, attempts: any[], score: number, total: number, timeSpent: number) => {
            if (attempts.length === 0) return Promise.resolve();
            return fetch('/api/questions/update-usage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: state.user!.userId,
                displayName: state.user!.displayName,
                examType,
                attempts,
                score,
                total,
                timeSpent,
              }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  console.log(`Successfully synced ${examType} results to Google Sheets.`);
                } else {
                  console.error(`Failed to sync ${examType} results:`, data.error);
                }
              })
              .catch(err => {
                console.error(`Error syncing ${examType} results:`, err);
              });
          };

          // Execute sequential/parallel updates
          Promise.all([
            sendUpdate('TGAT1', tgat1Attempts, t1Score, t1Total, t1Time),
            sendUpdate('TGAT2', tgat2Attempts, t2Score, t2Total, t2Time),
            sendUpdate('TGAT3', tgat3Attempts, t3Score, t3Total, t3Time),
          ]).then(() => {
            get().syncUserData();
          });
        }
      },
    }),
    {
      name: 'tgat-premium-store-v2', // Upgraded persistence key
      // Persist only persistent fields to keep store size reasonable
      partialize: (state) => ({
        user: state.user,
        bookmarkedQuestions: state.bookmarkedQuestions,
        examHistory: state.examHistory,
        mistakes: state.mistakes,
        streakCount: state.streakCount,
        lastActiveDate: state.lastActiveDate,
        unlockedAchievements: state.unlockedAchievements,
        studyPlans: state.studyPlans,
        mockSession: state.mockSession,
      }),
    }
  )
);
