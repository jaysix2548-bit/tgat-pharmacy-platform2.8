import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import crypto from 'crypto';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export async function POST(request: Request) {
  if (!SHEET_ID) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_SHEET_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    const {
      userId,
      displayName,
      examType,
      attempts, // Array of { questionId, selectedAnswer, correctAnswer, isCorrect, timeSpent }
      score,
      total,
      timeSpent, // Total seconds
    } = await request.json();

    if (!userId || !examType || !attempts || !Array.isArray(attempts)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields or attempts array.' },
        { status: 400 }
      );
    }

    const sheets = await getGoogleSheetsClient();
    const now = new Date().toISOString();
    const examId = crypto.randomUUID();

    // ==========================================
    // 1. Log to "Generated_Exams"
    // ==========================================
    const questionIdsList = attempts.map((a: any) => a.questionId);
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Generated_Exams!A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            examId,
            userId,
            examType,
            JSON.stringify(questionIdsList),
            score,
            total,
            now,
            timeSpent,
          ],
        ],
      },
    });

    // ==========================================
    // 2. Log to "Student_Scores"
    // ==========================================
    const formatTime = (sec: number) => {
      const minutes = Math.floor(sec / 60);
      const seconds = sec % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    const percentage = `${Math.round((score / total) * 100)}%`;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Student_Scores!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            crypto.randomUUID(), // scoreId
            userId,
            displayName || 'Student',
            examType,
            score,
            total,
            percentage,
            formatTime(timeSpent),
            now,
          ],
        ],
      },
    });

    // ==========================================
    // 3. Batch Log to "Exam_History" & Update Question Usage
    // ==========================================
    const historyRows = attempts.map((attempt: any) => [
      crypto.randomUUID(), // historyId
      userId,
      examType,
      attempt.questionId,
      attempt.selectedAnswer !== undefined ? String(attempt.selectedAnswer) : '',
      attempt.correctAnswer !== undefined ? String(attempt.correctAnswer) : '',
      attempt.isCorrect ? 'TRUE' : 'FALSE',
      attempt.timeSpent || 0,
      now,
    ]);

    // Append all question attempts to Exam_History in one call
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Exam_History!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: historyRows,
      },
    });

    // ==========================================
    // 4. Update Questions Usage in Sheet tabs
    // ==========================================
    // We fetch current IDs from sheets to find row indices
    const questionTab = examType.toUpperCase() === 'TGAT2' ? 'TGAT2_Questions' : 
                        (examType.toUpperCase() === 'TGAT3' ? 'TGAT3_Questions' : 'TGAT1_Questions');
    
    const questionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${questionTab}!A2:P1000`, // A: id, P: usageCount
    });

    const questionRows = questionsResponse.data.values || [];
    const updateRequests: any[] = [];

    attempts.forEach((attempt: any) => {
      // Find row index of this question
      let rowIndex = -1;
      let currentUsageCount = 0;

      for (let i = 0; i < questionRows.length; i++) {
        if (questionRows[i][0] === attempt.questionId) {
          rowIndex = i + 2; // 2-indexed
          currentUsageCount = parseInt(questionRows[i][15], 10) || 0; // Column P is index 15
          break;
        }
      }

      if (rowIndex !== -1) {
        updateRequests.push({
          range: `${questionTab}!O${rowIndex}:Q${rowIndex}`, // O: isUsed, P: usageCount, Q: lastUsedAt
          values: [['TRUE', currentUsageCount + 1, now]],
        });
      }
    });

    // Run batch updates for question usage metrics
    if (updateRequests.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: updateRequests,
        },
      });
    }

    // ==========================================
    // 5. Update "Mistakes" Notebook
    // ==========================================
    const mistakesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Mistakes!A2:F1000', // userId, questionId, examType, attempts, lastWrongAt, mastered
    });
    const mistakesRows = mistakesResponse.data.values || [];
    const newMistakes: any[] = [];
    const mistakesUpdates: any[] = [];

    const wrongAttempts = attempts.filter((a: any) => !a.isCorrect);

    wrongAttempts.forEach((attempt: any) => {
      let matchedIndex = -1;
      let existingAttempts = 0;

      for (let i = 0; i < mistakesRows.length; i++) {
        if (mistakesRows[i][0] === userId && mistakesRows[i][1] === attempt.questionId) {
          matchedIndex = i + 2;
          existingAttempts = parseInt(mistakesRows[i][3], 10) || 0;
          break;
        }
      }

      if (matchedIndex !== -1) {
        mistakesUpdates.push({
          range: `Mistakes!D${matchedIndex}:F${matchedIndex}`, // attempts, lastWrongAt, mastered
          values: [[existingAttempts + 1, now, 'FALSE']],
        });
      } else {
        newMistakes.push([
          userId,
          attempt.questionId,
          examType,
          1, // attempts
          now, // lastWrongAt
          'FALSE', // mastered
        ]);
      }
    });

    // Write updates for existing mistakes
    if (mistakesUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: mistakesUpdates,
        },
      });
    }

    // Append new mistakes
    if (newMistakes.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Mistakes!A:F',
        valueInputOption: 'RAW',
        requestBody: {
          values: newMistakes,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Usage metrics and history saved successfully!',
    });

  } catch (error: any) {
    console.error('Update Usage Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update question usage.' },
      { status: 500 }
    );
  }
}
