import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import fs from 'fs';
import path from 'path';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function cleanCell(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

async function fetchTabQuestions(sheets: any, tabName: string) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tabName}!A1:AZ1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0].map((h: string) => cleanCell(h));
    const questions: any[] = [];

    const parseAnswer = (val: string): number => {
      const clean = val.trim().toUpperCase();
      if (clean === 'A' || clean === '1') return 0;
      if (clean === 'B' || clean === '2') return 1;
      if (clean === 'C' || clean === '3') return 2;
      if (clean === 'D' || clean === '4') return 3;
      const parsed = parseInt(clean, 10);
      return isNaN(parsed) ? 0 : parsed;
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const rowObj: Record<string, string> = {};
      headers.forEach((header: string, idx: number) => {
        rowObj[header] = cleanCell(row[idx]);
      });

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
        ].map(o => o.trim()).filter(Boolean);
      }

      const answer = parseAnswer(rowObj.answer);
      const estimatedTime = parseInt(rowObj.estimatedTime, 10);
      const examWeight = parseInt(rowObj.examWeight, 10);
      const usageCount = parseInt(rowObj.usageCount, 10);

      let examCategory = rowObj.examId || rowObj.exam || rowObj.type || rowObj.subject || tabName || 'tgat1';
      examCategory = examCategory.toLowerCase().trim();
      if (!examCategory.startsWith('tgat')) {
        if (examCategory.includes('1')) examCategory = 'tgat1';
        else if (examCategory.includes('2')) examCategory = 'tgat2';
        else if (examCategory.includes('3')) examCategory = 'tgat3';
        else examCategory = 'tgat1';
      }

      let finalId = rowObj.id;
      if (finalId && /^\d+$/.test(finalId)) {
        const prefix = examCategory === 'tgat2' ? 'T2' : (examCategory === 'tgat3' ? 'T3' : 'T1');
        finalId = `${prefix}-${String(finalId).padStart(3, '0')}`;
      }

      const mappedQuestion: any = {
        id: finalId,
        difficulty: rowObj.difficulty || 'Medium',
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
        examCategory,
      };

      if (examCategory === 'tgat2') {
        mappedQuestion.subtopic = rowObj.subtopic || 'General';
        mappedQuestion.reasoningType = rowObj.reasoningType || 'Logical';
      }

      if (examCategory === 'tgat3') {
        mappedQuestion.competency = rowObj.competency || rowObj.section || 'General';
      }

      questions.push(mappedQuestion);
    }

    return questions;
  } catch (error) {
    console.error(`Error fetching tab ${tabName}:`, error);
    throw error;
  }
}

async function fetchTabChapters(sheets: any) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Study_Chapters!A1:Z100',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

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

    return chapters;
  } catch (error) {
    console.error('Error fetching Study Chapters:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const secretToken = process.env.SYNC_SECRET_KEY;

  if (secretToken && token !== secretToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid sync token.' },
      { status: 401 }
    );
  }

  if (!SHEET_ID) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_SHEET_ID is not configured in .env.local.' },
      { status: 500 }
    );
  }

  try {
    const sheets = await getGoogleSheetsClient();
    
    // Fetch spreadsheet metadata to see available tabs
    const metadataResponse = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    const availableTabs = metadataResponse.data.sheets?.map((s: any) => s.properties?.title) || [];

    let tgat1: any[] = [];
    let tgat2: any[] = [];
    let tgat3: any[] = [];
    let studyChapters: any[] = [];

    const hasNewQuestionsTabs = availableTabs.includes('TGAT1_Questions') && 
                                availableTabs.includes('TGAT2_Questions') && 
                                availableTabs.includes('TGAT3_Questions');

    if (hasNewQuestionsTabs) {
      tgat1 = await fetchTabQuestions(sheets, 'TGAT1_Questions');
      tgat2 = await fetchTabQuestions(sheets, 'TGAT2_Questions');
      tgat3 = await fetchTabQuestions(sheets, 'TGAT3_Questions');
    } else {
      const firstTab = availableTabs.find(t => t === 'ข้อสอบ') || availableTabs[0] || 'ข้อสอบ';
      const allQuestions = await fetchTabQuestions(sheets, firstTab);
      
      tgat1 = allQuestions.filter(q => q.examCategory === 'tgat1');
      tgat2 = allQuestions.filter(q => q.examCategory === 'tgat2');
      tgat3 = allQuestions.filter(q => q.examCategory === 'tgat3');

      if (allQuestions.length > 0 && tgat1.length === 0 && tgat2.length === 0 && tgat3.length === 0) {
        tgat1 = allQuestions;
      }
    }

    if (availableTabs.includes('Study_Chapters')) {
      studyChapters = await fetchTabChapters(sheets);
    }

    const projectDir = process.cwd();
    const dataDir = path.join(projectDir, 'src/data');

    let tgat1Updated = false;
    let tgat2Updated = false;
    let tgat3Updated = false;
    let chaptersUpdated = false;

    if (tgat1.length > 0) {
      const content = `import type { TGAT1Question } from "@/types/exam";\n\nexport const TGAT1_QUESTIONS: TGAT1Question[] = ${JSON.stringify(tgat1, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'tgat1.ts'), content, 'utf-8');
      tgat1Updated = true;
    }

    if (tgat2.length > 0) {
      const content = `import type { TGAT2Question } from "@/types/exam";\n\nexport const TGAT2_QUESTIONS: TGAT2Question[] = ${JSON.stringify(tgat2, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'tgat2.ts'), content, 'utf-8');
      tgat2Updated = true;
    }

    if (tgat3.length > 0) {
      const content = `import type { TGAT3Question } from "@/types/exam";\n\nexport const TGAT3_QUESTIONS: TGAT3Question[] = ${JSON.stringify(tgat3, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'tgat3.ts'), content, 'utf-8');
      tgat3Updated = true;
    }

    if (studyChapters.length > 0) {
      const content = `import type { StudyChapter } from "@/types/exam";\n\nexport const STUDY_CHAPTERS: StudyChapter[] = ${JSON.stringify(studyChapters, null, 2)};\n`;
      fs.writeFileSync(path.join(dataDir, 'studyContent.ts'), content, 'utf-8');
      chaptersUpdated = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Questions synchronized successfully!',
      stats: {
        tgat1: { count: tgat1.length, updated: tgat1Updated },
        tgat2: { count: tgat2.length, updated: tgat2Updated },
        tgat3: { count: tgat3.length, updated: tgat3Updated },
        studyChapters: { count: studyChapters.length, updated: chaptersUpdated },
      },
    });

  } catch (error: any) {
    console.error('API Sync Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed.' },
      { status: 500 }
    );
  }
}
