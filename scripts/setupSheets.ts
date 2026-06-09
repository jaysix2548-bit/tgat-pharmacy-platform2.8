import { loadEnvConfig } from '@next/env';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';

// Load environment variables
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in .env.local");
  process.exit(1);
}

// Define the 9 tabs and their headers
const DATABASE_SCHEMA: Record<string, string[]> = {
  Users: [
    'userId',
    'username',
    'password',
    'displayName',
    'role',
    'createdAt',
    'lastLogin',
    'totalExams',
    'avgScore',
    'weakTopic',
    'streak',
  ],
  TGAT1_Questions: [
    'id',
    'subject',
    'difficulty',
    'topic',
    'subtopic',
    'section',
    'partTitle',
    'suggestedTime',
    'estimatedTime',
    'frequency',
    'examWeight',
    'yearPattern',
    'question',
    'passage',
    'choiceA',
    'choiceB',
    'choiceC',
    'choiceD',
    'answer',
    'correctExplanation',
    'wrongExplanation',
    'mindset',
    'speedHack',
    'isUsed',
    'usageCount',
    'lastUsedAt',
    'tags',
    'createdAt',
  ],
  TGAT2_Questions: [
    'id',
    'subject',
    'difficulty',
    'topic',
    'subtopic',
    'section',
    'partTitle',
    'suggestedTime',
    'estimatedTime',
    'frequency',
    'examWeight',
    'yearPattern',
    'question',
    'passage',
    'choiceA',
    'choiceB',
    'choiceC',
    'choiceD',
    'choiceE',
    'answer',
    'correctExplanation',
    'wrongExplanation',
    'mindset',
    'speedHack',
    'isUsed',
    'usageCount',
    'lastUsedAt',
    'tags',
    'createdAt',
    'reasoningType',
  ],
  TGAT3_Questions: [
    'id',
    'subject',
    'difficulty',
    'topic',
    'subtopic',
    'section',
    'partTitle',
    'suggestedTime',
    'estimatedTime',
    'frequency',
    'examWeight',
    'yearPattern',
    'question',
    'passage',
    'choiceA',
    'choiceB',
    'choiceC',
    'choiceD',
    'answer',
    'correctExplanation',
    'wrongExplanation',
    'mindset',
    'speedHack',
    'isUsed',
    'usageCount',
    'lastUsedAt',
    'tags',
    'createdAt',
    'competency',
  ],
  Exam_History: [
    'historyId',
    'userId',
    'examType',
    'questionId',
    'selectedAnswer',
    'correctAnswer',
    'isCorrect',
    'timeSpent',
    'createdAt',
  ],
  Generated_Exams: [
    'examId',
    'userId',
    'examType',
    'questionIds',
    'score',
    'total',
    'submittedAt',
  ],
  Mistakes: [
    'userId',
    'questionId',
    'examType',
    'attempts',
    'lastWrongAt',
    'mastered',
  ],
  Study_Chapters: [
    'id',
    'examType',
    'title',
    'content',
    'summary',
    'miniQuizIds',
    'difficulty',
    'estimatedReadTime',
  ],
  Student_Scores: [
    'scoreId',
    'userId',
    'displayName',
    'examType',
    'score',
    'total',
    'percentage',
    'timeSpent',
    'submittedAt',
  ],
  Question_History: [
    'questionId',
    'questionText',
    'conceptTags',
    'difficulty',
    'reasoningType',
    'scenarioType',
    'questionHash',
    'createdAt',
  ],
};

function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
}

async function setupDatabase() {
  try {
    const sheets = await getGoogleSheetsClient();
    console.log("🚀 Starting Google Sheets DB Initialization...");

    // 1. Fetch current sheets metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    
    const existingSheets = spreadsheet.data.sheets || [];
    const existingTitles = existingSheets.map((s) => s.properties?.title) || [];
    console.log(`📊 Current spreadsheet tabs: ${JSON.stringify(existingTitles)}`);

    // Keep track of batch operations to apply formatting (freeze row, bold text)
    const requests: any[] = [];

    // 2. Loop through required schema and create missing tabs
    for (const [tabName, headers] of Object.entries(DATABASE_SCHEMA)) {
      let sheetId: number | undefined;

      if (!existingTitles.includes(tabName)) {
        console.log(`➕ Creating tab "${tabName}"...`);
        const newSheet = await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: tabName,
                  },
                },
              },
            ],
          },
        });
        const rawId = newSheet.data.replies?.[0]?.addSheet?.properties?.sheetId;
        sheetId = rawId ?? undefined;
        console.log(`✅ Created tab "${tabName}" with sheetId: ${sheetId}`);
      } else {
        const found = existingSheets.find((s) => s.properties?.title === tabName);
        const rawId = found?.properties?.sheetId;
        sheetId = rawId ?? undefined;
        console.log(`ℹ️ Tab "${tabName}" already exists (sheetId: ${sheetId})`);
      }

      if (sheetId === undefined) continue;

      // 3. Write Headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tabName}!A1:${getColumnLetter(headers.length)}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });
      console.log(`📝 Wrote header columns to "${tabName}"`);

      // 4. Queue requests to freeze header row and bold the text
      requests.push(
        // Freeze first row
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        // Format headers: bold, centered, light-gray background
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headers.length,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
                backgroundColor: {
                  red: 0.93,
                  green: 0.93,
                  blue: 0.93,
                },
              },
            },
            fields: 'userEnteredFormat(textFormat,horizontalAlignment,backgroundColor)',
          },
        }
      );
    }

    // 5. Apply all batch formatting requests
    if (requests.length > 0) {
      console.log(`🎨 Formatting sheet rows (freezing and styling headers)...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests,
        },
      });
      console.log("✅ Applied formatting successfully!");
    }

    console.log("🎉 Google Sheets Database Setup Completed Successfully!");
  } catch (error) {
    console.error("❌ Google Sheets DB Setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
