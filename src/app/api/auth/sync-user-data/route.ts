import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getGoogleSheetId } from '@/lib/googleSheets';
import { cookies } from 'next/headers';

export async function GET() {
  const SHEET_ID = getGoogleSheetId();
  if (!SHEET_ID) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_SHEET_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    // 1. Authenticate user using the secure session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session not found.' },
        { status: 401 }
      );
    }

    const { userId } = JSON.parse(sessionCookie.value);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid user session.' },
        { status: 400 }
      );
    }

    const sheets = await getGoogleSheetsClient();

    // 2. Fetch data from "Generated_Exams" tab
    const examsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Generated_Exams!A2:H1000', // examId, userId, examType, questionIds, score, total, submittedAt, timeSpent
    });
    const examRows = examsResponse.data.values || [];
    
    // Filter exams by current userId
    const userExams = examRows
      .filter((row) => row[1] && row[1].trim() === userId)
      .map((row) => {
        let questionIds = [];
        try {
          questionIds = JSON.parse(row[3] || '[]');
        } catch {
          questionIds = (row[3] || '').split(',').map((id: string) => id.trim()).filter(Boolean);
        }

        return {
          examId: row[2] || 'tgat1', // tgat1/tgat2/tgat3
          score: parseInt(row[4], 10) || 0,
          total: parseInt(row[5], 10) || 0,
          timestamp: new Date(row[6] || Date.now()).getTime(),
          timeSpent: parseInt(row[7], 10) || 0,
          questionIds,
          answers: {}, // Mock or parsed if column available
          perQuestionTime: {},
          mode: 'practice',
        };
      });

    // 3. Fetch data from "Mistakes" tab
    const mistakesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Mistakes!A2:F1000', // userId, questionId, examType, attempts, lastWrongAt, mastered
    });
    const mistakeRows = mistakesResponse.data.values || [];

    // Filter mistakes by current userId and map to Record format
    const userMistakes: Record<string, any> = {};
    mistakeRows
      .filter((row) => row[0] && row[0].trim() === userId)
      .forEach((row) => {
        const qId = row[1];
        if (qId) {
          userMistakes[qId] = {
            questionId: qId,
            examId: row[2] || 'tgat1',
            attempts: parseInt(row[3], 10) || 1,
            date: row[4] || new Date().toISOString(), // maps to date in state
            correct: row[5] === 'TRUE' || row[5] === 'true' ? 1 : 0, // mastered check
          };
        }
      });

    // 4. Also fetch User Profile fields (totalExams, avgScore, streak, weakTopic) from "Users"
    const usersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Users!A2:K1000',
    });
    const userRows = usersResponse.data.values || [];
    let streakCount = 0;
    let displayName = '';

    for (const row of userRows) {
      if (row[0] && row[0].trim() === userId) {
        streakCount = parseInt(row[10], 10) || 0; // streak is column K (index 10)
        displayName = row[3] || ''; // displayName is column D (index 3)
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        examHistory: userExams,
        mistakes: userMistakes,
        streakCount,
        displayName,
      },
    });
  } catch (error: any) {
    console.error('Sync User Data Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync user data.' },
      { status: 500 }
    );
  }
}
