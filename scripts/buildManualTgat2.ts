import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in environment variables. Check .env.local");
  process.exit(1);
}

interface TGAT2Question {
  id: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  section: string;
  partTitle: string;
  suggestedTime: string;
  estimatedTime: number;
  frequency: string;
  examWeight: number;
  yearPattern: string;
  text: string;
  passage: string | null;
  options: string[];
  answer: number;
  correctExplanation: string;
  wrongExplanation: string;
  mindset: string;
  speedHack: string;
  subtopic: string;
  reasoningType: string;
}

// 1. Load questions from JSON files
function loadQuestions(): TGAT2Question[] {
  console.log('⏳ Loading partitioned TGAT2 questions...');
  const part1Path = path.join(__dirname, 'tgat2_part1.json');
  const part2Path = path.join(__dirname, 'tgat2_part2.json');
  const part3Path = path.join(__dirname, 'tgat2_part3.json');

  const part1 = JSON.parse(fs.readFileSync(part1Path, 'utf-8'));
  const part2 = JSON.parse(fs.readFileSync(part2Path, 'utf-8'));
  const part3 = JSON.parse(fs.readFileSync(part3Path, 'utf-8'));

  const allQuestions = [...part1, ...part2, ...part3];
  console.log(`✅ Loaded ${allQuestions.length} questions in total.`);
  
  if (allQuestions.length !== 80) {
    console.error(`❌ Total questions count is ${allQuestions.length}, expected exactly 80!`);
    process.exit(1);
  }

  // Set sequential IDs (T2-001 to T2-080)
  allQuestions.forEach((q, idx) => {
    const numStr = String(idx + 1).padStart(3, '0');
    q.id = `T2-${numStr}`;
  });

  return allQuestions;
}

// 2. Overwrite src/data/tgat2.ts local file
function updateLocalTgat2(questions: TGAT2Question[]) {
  console.log('⏳ Overwriting local src/data/tgat2.ts file...');
  const dataDir = path.join(projectDir, 'src/data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputContent = `import type { TGAT2Question } from "@/types/exam";

export const TGAT2_QUESTIONS: TGAT2Question[] = ${JSON.stringify(questions, null, 2)};
`;

  fs.writeFileSync(path.join(dataDir, 'tgat2.ts'), outputContent, 'utf-8');
  console.log(`✅ Successfully wrote ${questions.length} questions locally to src/data/tgat2.ts`);
}

// 3. Overwrite Google Sheet database
async function uploadToSheets(questions: TGAT2Question[]) {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn('⚠️ Google Credentials not fully configured in env. Skipping Sheets upload.');
    return;
  }

  console.log('⏳ Authenticating with Google Sheets API...');
  try {
    const sheets = await getGoogleSheetsClient();
    const nowStr = new Date().toISOString();

    console.log(`🧹 Clearing tab "TGAT2_Questions"...`);
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: 'TGAT2_Questions!A2:AD1000'
    });

    console.log(`💾 Uploading ${questions.length} manual questions to "TGAT2_Questions" tab...`);
    const rows = questions.map(q => [
      q.id,
      'TGAT2',
      q.difficulty,
      q.topic,
      q.subtopic || '',
      q.section,
      q.partTitle,
      q.suggestedTime,
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
      'FALSE', // isUsed
      0, // usageCount
      '', // lastUsedAt
      '', // tags
      nowStr, // createdAt
      q.reasoningType || 'Logical'
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'TGAT2_Questions!A2',
      valueInputOption: 'RAW',
      requestBody: {
        values: rows
      }
    });
    console.log('✅ Google Sheets tab "TGAT2_Questions" successfully updated!');

    // Append to Question_History
    console.log('💾 Appending to "Question_History" tab...');
    const historyRows = questions.map(q => {
      const fullText = `${q.passage ? `${q.passage}\n` : ''}${q.text}\nOptions: ${q.options.join(' | ')}`;
      const hash = crypto.createHash('md5').update(fullText).digest('hex');
      return [
        q.id,
        fullText,
        q.topic,
        q.difficulty,
        q.reasoningType || 'Logical',
        q.section,
        hash,
        nowStr
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Question_History!A:A',
      valueInputOption: 'RAW',
      requestBody: {
        values: historyRows
      }
    });
    console.log('✅ Google Sheets "Question_History" tab successfully appended!');

  } catch (error: any) {
    console.error('❌ Failed to upload to Google Sheets:', error.message || error);
  }
}

async function run() {
  console.log('🚀 STARTING MANUAL TGAT2 EXAM REPLACEMENT SCRIPT');
  console.log('--------------------------------------------------');
  const questions = loadQuestions();
  updateLocalTgat2(questions);
  await uploadToSheets(questions);
  console.log('🎉 ALL DONE!');
}

run();
