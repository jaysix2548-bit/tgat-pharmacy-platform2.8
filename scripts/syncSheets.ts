import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';

// Load environment variables from .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in environment variables. Check .env.local");
  process.exit(1);
}

// Map column values safely
function cleanCell(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

async function fetchTabQuestions(sheets: any, tabName: string) {
  console.log(`⏳ Fetching tab "${tabName}" from Google Sheets...`);
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:AZ1000`, // Fetch up to 1000 questions
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.warn(`⚠️ No data or headers found in tab "${tabName}"`);
      return [];
    }

    const headers = rows[0].map((h: string) => cleanCell(h));
    console.log(`📋 Headers for tab "${tabName}":`, JSON.stringify(headers));
    const questions: any[] = [];

    // Helper to parse answers (handles A/B/C/D, 1/2/3/4, 0/1/2/3)
    const parseAnswer = (val: string): number => {
      const clean = val.trim().toUpperCase();
      if (clean === 'A' || clean === '1') return 0;
      if (clean === 'B' || clean === '2') return 1;
      if (clean === 'C' || clean === '3') return 2;
      if (clean === 'D' || clean === '4') return 3;
      if (clean === 'E' || clean === '5') return 4;
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) ? 0 : parsed;
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

      const rowObj: Record<string, string> = {};
      headers.forEach((header: string, idx: number) => {
        rowObj[header] = cleanCell(row[idx]);
      });

      // Assemble options array
      let options: string[] = [];
      if (rowObj.options) {
        try {
          options = JSON.parse(rowObj.options);
        } catch {
          options = rowObj.options.split('\n').map(o => o.trim()).filter(Boolean);
        }
      } else {
        options = [
          rowObj.choiceA || rowObj.option1 || rowObj.optionA || rowObj.choice1 || '',
          rowObj.choiceB || rowObj.option2 || rowObj.optionB || rowObj.choice2 || '',
          rowObj.choiceC || rowObj.option3 || rowObj.optionC || rowObj.choice3 || '',
          rowObj.choiceD || rowObj.option4 || rowObj.optionD || rowObj.choice4 || '',
          rowObj.choiceE || rowObj.option5 || rowObj.optionE || rowObj.choice5 || '',
        ].map(o => o.trim()).filter(Boolean);
      }

      const answer = parseAnswer(rowObj.answer);
      const estimatedTime = parseInt(rowObj.estimatedTime, 10);
      const examWeight = parseInt(rowObj.examWeight, 10);
      const usageCount = parseInt(rowObj.usageCount, 10);

      // Determine exam category
      let examCategory = rowObj.examId || rowObj.exam || rowObj.type || rowObj.subject || tabName || 'tgat1';
      examCategory = examCategory.toLowerCase().trim();
      if (!examCategory.startsWith('tgat')) {
        if (examCategory.includes('1')) examCategory = 'tgat1';
        else if (examCategory.includes('2')) examCategory = 'tgat2';
        else if (examCategory.includes('3')) examCategory = 'tgat3';
        else examCategory = 'tgat1';
      }

      // Standardize ID format (e.g. "1" -> "T1-001")
      let finalId = rowObj.id;
      if (finalId && /^\d+$/.test(finalId)) {
        const prefix = examCategory === 'tgat2' ? 'T2' : (examCategory === 'tgat3' ? 'T3' : 'T1');
        finalId = `${prefix}-${String(finalId).padStart(3, '0')}`;
      }

      let cleanDifficulty = cleanCell(rowObj.difficulty) || 'Medium';
      cleanDifficulty = cleanDifficulty.charAt(0).toUpperCase() + cleanDifficulty.slice(1).toLowerCase();
      if (!['Easy', 'Medium', 'Hard', 'Elite'].includes(cleanDifficulty)) {
        cleanDifficulty = 'Medium';
      }

      const mappedQuestion: any = {
        id: finalId,
        difficulty: cleanDifficulty,
        topic: rowObj.topic || rowObj.tags || 'General',
        section: rowObj.section || rowObj.topic || 'General',
        partTitle: rowObj.partTitle || '',
        suggestedTime: rowObj.suggestedTime || 'Suggested Time: 45s',
        estimatedTime: isNaN(estimatedTime) ? 60 : estimatedTime,
        frequency: rowObj.frequency || 'Medium',
        examWeight: isNaN(examWeight) ? 5 : examWeight,
        yearPattern: rowObj.yearStyle || rowObj.yearPattern || '2567-2568',
        text: rowObj.text || rowObj.question || '',
        passage: rowObj.passage || null,
        options,
        answer: isNaN(answer) ? 0 : answer,
        correctExplanation: rowObj.correctExplanation || rowObj.explanation || '',
        wrongExplanation: rowObj.wrongExplanation || rowObj.explanation || '',
        mindset: rowObj.mindset || '',
        speedHack: rowObj.speedHack || '',
        isUsed: rowObj.isUsed === 'TRUE' || rowObj.isUsed === 'true',
        usageCount: isNaN(usageCount) ? 0 : usageCount,
        lastUsedAt: rowObj.lastUsedAt || null,
        examCategory, // internal tracking
      };

      // Add subtopic & reasoningType for TGAT2
      if (examCategory === 'tgat2') {
        mappedQuestion.subtopic = rowObj.subtopic || 'General';
        mappedQuestion.reasoningType = rowObj.reasoningType || 'Logical';
      }

      // Add competency for TGAT3
      if (examCategory === 'tgat3') {
        mappedQuestion.competency = rowObj.competency || rowObj.section || 'General';
      }

      // Quick validation
      const expectedLength = examCategory === 'tgat2' ? 5 : 4;
      if (!mappedQuestion.id || options.length !== expectedLength || isNaN(answer) || answer < 0 || answer >= options.length) {
        console.warn(`⚠️ Row ${i + 1} in "${tabName}" failed validation checks. ID: ${mappedQuestion.id}, Options: ${options.length}, Answer: ${rowObj.answer}`);
      }

      questions.push(mappedQuestion);
    }

    console.log(`✅ Loaded ${questions.length} valid questions from tab "${tabName}"`);
    return questions;
  } catch (error: any) {
    console.error(`❌ Failed to fetch tab "${tabName}":`, error.message);
    return [];
  }
}

async function fetchTabChapters(sheets: any) {
  console.log(`⏳ Fetching Study Chapters from Google Sheets...`);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Study_Chapters!A1:Z100', // Fetch up to 100 chapters
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.warn('⚠️ No study chapters data found.');
      return [];
    }

    const headers = rows[0].map((h: string) => cleanCell(h));
    const chapters: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const rowObj: Record<string, string> = {};
      headers.forEach((header: string, idx: number) => {
        rowObj[header] = cleanCell(row[idx]);
      });

      const examId = (rowObj.examType || rowObj.examId || 'tgat1').toLowerCase().trim();
      const miniQuizIds = (rowObj.miniQuizIds || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      const examples = rowObj.examples
        ? rowObj.examples.split('\n').map(e => e.trim()).filter(Boolean)
        : [rowObj.example1, rowObj.example2].map(e => (e || '').trim()).filter(Boolean);

      const mindsetTips = rowObj.mindsetTips
        ? rowObj.mindsetTips.split('\n').map(t => t.trim()).filter(Boolean)
        : [rowObj.mindsetTip1, rowObj.mindsetTip2, rowObj.mindsetTip3].map(t => (t || '').trim()).filter(Boolean);

      chapters.push({
        id: rowObj.id,
        examId: examId.includes('1') ? 'tgat1' : (examId.includes('2') ? 'tgat2' : 'tgat3'),
        title: rowObj.title || '',
        content: rowObj.content || '',
        examples,
        mindsetTips,
        miniQuizIds,
      });
    }

    console.log(`✅ Loaded ${chapters.length} valid study chapters.`);
    return chapters;
  } catch (error: any) {
    console.error(`❌ Failed to fetch Study Chapters:`, error.message);
    return [];
  }
}

async function runSync() {
  try {
    const sheets = await getGoogleSheetsClient();
    console.log('🚀 Starting Google Sheets Question Database Sync...');

    // Fetch spreadsheet metadata to see available tabs
    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    const availableTabs = metadataResponse.data.sheets?.map((s: any) => s.properties?.title) || [];
    console.log(`📊 Available tabs in this Google Sheet: ${JSON.stringify(availableTabs)}`);

    let tgat1Questions: any[] = [];
    let tgat2Questions: any[] = [];
    let tgat3Questions: any[] = [];
    let studyChapters: any[] = [];

    const hasNewQuestionsTabs = availableTabs.includes('TGAT1_Questions') && 
                                availableTabs.includes('TGAT2_Questions') && 
                                availableTabs.includes('TGAT3_Questions');

    if (hasNewQuestionsTabs) {
      console.log("📂 Standardized separate question tabs detected.");
      tgat1Questions = await fetchTabQuestions(sheets, 'TGAT1_Questions');
      tgat2Questions = await fetchTabQuestions(sheets, 'TGAT2_Questions');
      tgat3Questions = await fetchTabQuestions(sheets, 'TGAT3_Questions');
    } else {
      const firstTab = availableTabs.find(t => t === 'ข้อสอบ') || availableTabs[0] || 'ข้อสอบ';
      console.log(`📂 Fallback single tab detected. Fetching from "${firstTab}"...`);
      const allQuestions = await fetchTabQuestions(sheets, firstTab);
      
      tgat1Questions = allQuestions.filter(q => q.examCategory === 'tgat1');
      tgat2Questions = allQuestions.filter(q => q.examCategory === 'tgat2');
      tgat3Questions = allQuestions.filter(q => q.examCategory === 'tgat3');

      if (allQuestions.length > 0 && tgat1Questions.length === 0 && tgat2Questions.length === 0 && tgat3Questions.length === 0) {
        tgat1Questions = allQuestions;
      }
    }

    // Fetch study chapters
    if (availableTabs.includes('Study_Chapters')) {
      studyChapters = await fetchTabChapters(sheets);
    }

    const dataDir = path.join(projectDir, 'src/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (tgat1Questions.length > 0) {
      const outputPath = path.join(dataDir, 'tgat1.ts');
      const content = `import type { TGAT1Question } from "@/types/exam";\n\nexport const TGAT1_QUESTIONS: TGAT1Question[] = ${JSON.stringify(tgat1Questions, null, 2)};\n`;
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`✨ Updated [tgat1.ts] (${tgat1Questions.length} questions)`);
    }

    if (tgat2Questions.length > 0) {
      const outputPath = path.join(dataDir, 'tgat2.ts');
      const content = `import type { TGAT2Question } from "@/types/exam";\n\nexport const TGAT2_QUESTIONS: TGAT2Question[] = ${JSON.stringify(tgat2Questions, null, 2)};\n`;
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`✨ Updated [tgat2.ts] (${tgat2Questions.length} questions)`);
    }

    if (tgat3Questions.length > 0) {
      const outputPath = path.join(dataDir, 'tgat3.ts');
      const content = `import type { TGAT3Question } from "@/types/exam";\n\nexport const TGAT3_QUESTIONS: TGAT3Question[] = ${JSON.stringify(tgat3Questions, null, 2)};\n`;
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`✨ Updated [tgat3.ts] (${tgat3Questions.length} questions)`);
    }

    if (studyChapters.length > 0) {
      const outputPath = path.join(dataDir, 'studyContent.ts');
      const content = `import type { StudyChapter } from "@/types/exam";\n\nexport const STUDY_CHAPTERS: StudyChapter[] = ${JSON.stringify(studyChapters, null, 2)};\n`;
      fs.writeFileSync(outputPath, content, 'utf-8');
      console.log(`✨ Updated [studyContent.ts] (${studyChapters.length} chapters)`);
    }

    console.log('🎉 Sync completed successfully!');
  } catch (error) {
    console.error('❌ Sync failed with critical error:', error);
    process.exit(1);
  }
}

runSync();
