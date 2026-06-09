import { loadEnvConfig } from '@next/env';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';
import { TGAT1_QUESTIONS } from '../src/data/tgat1';
import { TGAT2_QUESTIONS } from '../src/data/tgat2';
import { TGAT3_QUESTIONS } from '../src/data/tgat3';
import { STUDY_CHAPTERS } from '../src/data/studyContent';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in .env.local");
  process.exit(1);
}

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

async function populateSheets() {
  try {
    const sheets = await getGoogleSheetsClient();
    console.log("🚀 Starting Google Sheets Population from local data files...");

    const nowStr = new Date().toISOString();

    // 1. Map TGAT1
    const tgat1Rows = TGAT1_QUESTIONS.map(q => [
      q.id,
      'TGAT1',
      q.difficulty,
      q.topic,
      '', // subtopic
      q.section || '',
      q.partTitle || '',
      q.suggestedTime || '',
      q.estimatedTime,
      q.frequency,
      q.examWeight,
      q.yearPattern,
      q.text,
      q.passage || '',
      q.options[0] || '',
      q.options[1] || '',
      q.options[2] || '',
      q.options[3] || '',
      q.answer === 0 ? 'A' : (q.answer === 1 ? 'B' : (q.answer === 2 ? 'C' : 'D')),
      q.correctExplanation || '',
      q.wrongExplanation || '',
      q.mindset || '',
      q.speedHack || '',
      q.isUsed ? 'TRUE' : 'FALSE',
      q.usageCount || 0,
      q.lastUsedAt || '',
      '', // tags
      nowStr, // createdAt
    ]);

    // 2. Map TGAT2
    const tgat2Rows = TGAT2_QUESTIONS.map(q => [
      q.id,
      'TGAT2',
      q.difficulty,
      q.topic,
      q.subtopic || '',
      q.section || '',
      q.partTitle || '',
      q.suggestedTime || '',
      q.estimatedTime,
      q.frequency,
      q.examWeight,
      q.yearPattern,
      q.text,
      q.passage || '',
      q.options[0] || '',
      q.options[1] || '',
      q.options[2] || '',
      q.options[3] || '',
      q.options[4] || '',
      q.answer === 0 ? 'A' : (q.answer === 1 ? 'B' : (q.answer === 2 ? 'C' : (q.answer === 3 ? 'D' : 'E'))),
      q.correctExplanation || '',
      q.wrongExplanation || '',
      q.mindset || '',
      q.speedHack || '',
      q.isUsed ? 'TRUE' : 'FALSE',
      q.usageCount || 0,
      q.lastUsedAt || '',
      '', // tags
      nowStr, // createdAt
      q.reasoningType || '',
    ]);

    // 3. Map TGAT3
    const tgat3Rows = TGAT3_QUESTIONS.map(q => [
      q.id,
      'TGAT3',
      q.difficulty,
      q.topic,
      '', // subtopic
      q.section || '',
      q.partTitle || '',
      q.suggestedTime || '',
      q.estimatedTime,
      q.frequency,
      q.examWeight,
      q.yearPattern,
      q.text,
      q.passage || '',
      q.options[0] || '',
      q.options[1] || '',
      q.options[2] || '',
      q.options[3] || '',
      q.answer === 0 ? 'A' : (q.answer === 1 ? 'B' : (q.answer === 2 ? 'C' : 'D')),
      q.correctExplanation || '',
      q.wrongExplanation || '',
      q.mindset || '',
      q.speedHack || '',
      q.isUsed ? 'TRUE' : 'FALSE',
      q.usageCount || 0,
      q.lastUsedAt || '',
      '', // tags
      nowStr, // createdAt
      q.competency || '',
    ]);

    // 4. Map Chapters
    const chapterRows = STUDY_CHAPTERS.map(c => [
      c.id,
      c.examId,
      c.title,
      c.content,
      c.mindsetTips.join('\n'), // summary
      c.miniQuizIds.join(','),
      'Medium',
      '10 mins',
    ]);

    // Clear old values and insert new values
    const populateTab = async (tabName: string, rows: any[][], columnsCount: number) => {
      const colLetter = getColumnLetter(columnsCount);
      
      console.log(`🧹 Clearing old data in ${tabName}...`);
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `${tabName}!A2:${colLetter}1000`,
      });

      if (rows.length > 0) {
        console.log(`📤 Appending ${rows.length} rows to ${tabName}...`);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${tabName}!A2:${colLetter}${rows.length + 1}`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rows,
          },
        });
        console.log(`✅ Populated ${tabName} successfully!`);
      }
    };

    await populateTab('TGAT1_Questions', tgat1Rows, 28);
    await populateTab('TGAT2_Questions', tgat2Rows, 30);
    await populateTab('TGAT3_Questions', tgat3Rows, 29);
    await populateTab('Study_Chapters', chapterRows, 8);

    console.log("🎉 All database tabs populated successfully from local data!");
  } catch (error) {
    console.error("❌ Failed to populate sheets:", error);
    process.exit(1);
  }
}

populateSheets();
