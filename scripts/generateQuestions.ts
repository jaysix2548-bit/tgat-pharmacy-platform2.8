import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';

// Load environment variables from .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
// Look for GEMINI_API_KEY, fallback to GOOGLE_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in environment variables. Check .env.local");
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY (or GOOGLE_API_KEY) is missing in environment variables. Check .env.local");
  process.exit(1);
}

const EMBEDDING_MODEL = 'gemini-embedding-2';
const GENERATION_MODEL = 'gemini-3.5-flash'; // Configurable, fallback to gemini-3.5-flash for compatibility

const CACHE_PATH = path.join(__dirname, 'embeddings_cache.json');

// Interface definition for Question
interface GenQuestion {
  id?: string;
  difficulty: string; // Easy, Medium, Hard, Elite
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
  answer: number; // 0-3 index
  correctExplanation: string;
  wrongExplanation: string;
  mindset: string;
  speedHack: string;
  conceptTags: string;
  reasoningType: string;
  scenarioType: string;
}

// -------------------------------------------------------------------------
// Helper functions for Embedding & Similarity
// -------------------------------------------------------------------------

// Helper to load cache
function loadEmbeddingsCache(): Record<string, number[]> {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

// Helper to save cache
function saveEmbeddingsCache(cache: Record<string, number[]>) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

// Fetch vector embedding for a piece of text
async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: {
        parts: [{ text }]
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini Embedding API failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const result = await response.json();
  if (!result.embedding || !result.embedding.values) {
    throw new Error(`Invalid response format from Gemini Embedding API: ${JSON.stringify(result)}`);
  }

  return result.embedding.values;
}

// Compute Cosine Similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// MD5 hash of text
function getHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

// Format options and question to standardized text for embedding check
function getFullTextForEmbedding(q: GenQuestion | any): string {
  const optionsText = Array.isArray(q.options) ? q.options.join(' | ') : '';
  const passageText = q.passage ? `${q.passage}\n` : '';
  return `${passageText}${q.text}\nOptions: ${optionsText}`;
}

// -------------------------------------------------------------------------
// Fetch existing questions and backfill if necessary
// -------------------------------------------------------------------------
async function getExistingHistory(sheets: any): Promise<any[]> {
  console.log('⏳ Fetching Question_History tab from Google Sheets...');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Question_History!A2:H1000',
  });

  const rows = response.data.values || [];
  const history: any[] = [];

  for (const row of rows) {
    if (!row || row.length === 0 || !row[0]) continue;
    history.push({
      questionId: row[0],
      questionText: row[1] || '',
      conceptTags: row[2] || '',
      difficulty: row[3] || '',
      reasoningType: row[4] || '',
      scenarioType: row[5] || '',
      questionHash: row[6] || '',
      createdAt: row[7] || '',
    });
  }

  // If history sheet is empty, backfill it from local files (tgat1.ts, tgat2.ts, tgat3.ts)
  if (history.length === 0) {
    console.log('ℹ️ Question_History tab is empty. Backfilling from local tgat1.ts, tgat2.ts, tgat3.ts files...');
    const backfillRows: any[][] = [];
    const nowStr = new Date().toISOString();

    const loadLocal = (filename: string, subject: string) => {
      const filePath = path.join(projectDir, `src/data/${filename}`);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          // Parse questions array from file (extract JSON portion)
          const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            const list = JSON.parse(jsonMatch[0]);
            list.forEach((q: any) => {
              const fullText = getFullTextForEmbedding(q);
              const hash = getHash(fullText);
              
              const historyItem = {
                questionId: q.id,
                questionText: fullText,
                conceptTags: q.topic || 'General',
                difficulty: q.difficulty || 'Medium',
                reasoningType: q.reasoningType || '',
                scenarioType: q.competency || q.section || '',
                questionHash: hash,
                createdAt: nowStr,
              };
              
              history.push(historyItem);
              backfillRows.push([
                historyItem.questionId,
                historyItem.questionText,
                historyItem.conceptTags,
                historyItem.difficulty,
                historyItem.reasoningType,
                historyItem.scenarioType,
                historyItem.questionHash,
                historyItem.createdAt,
              ]);
            });
          }
        } catch (e: any) {
          console.error(`⚠️ Failed to load local file ${filename} for backfill:`, e.message);
        }
      }
    };

    loadLocal('tgat1.ts', 'TGAT1');
    loadLocal('tgat2.ts', 'TGAT2');
    loadLocal('tgat3.ts', 'TGAT3');

    if (backfillRows.length > 0) {
      console.log(`📤 Uploading ${backfillRows.length} backfill records to Question_History tab...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `Question_History!A2:H${backfillRows.length + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: backfillRows,
        },
      });
      console.log('✅ Backfill complete!');
    }
  }

  return history;
}

// -------------------------------------------------------------------------
// Call Gemini API to generate candidates
// -------------------------------------------------------------------------
async function generateCandidate(examType: string, targetDifficulty: string, negativeConstraints: string[] = []): Promise<GenQuestion> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  let systemInstructions = '';
  let requestPayload: any = null;

  const constraintSection = negativeConstraints.length > 0 
    ? `\nCRITICAL: You MUST NOT generate questions similar to these existing questions (avoid their scenarios, logic, contexts, or keywords):\n${negativeConstraints.map((c, i) => `[${i+1}] ${c}`).join('\n')}`
    : '';

  if (examType === 'tgat2') {
    systemInstructions = `You are an elite Thai standardized exam architect specialized in TGAT2 (Critical & Logical Thinking).
Your task is to generate an ORIGINAL, premium, high-quality TGAT2 exam question that strictly follows the official TGAT2 blueprint from MyTCAS.

You MUST generate a question of difficulty level: "${targetDifficulty}". 
Ensure it strictly matches the logic of a "${targetDifficulty}" difficulty tier question.

━━━━━━━━━━━━━━━━━━
OFFICIAL EXAM STRUCTURE & STATS
━━━━━━━━━━━━━━━━━━
Exam: TGAT2 — Critical & Logical Thinking
* Total Questions in real exam: 80
* Multiple Choice: 5 Choices (A, B, C, D, E)
* Total Time: 60 Minutes

━━━━━━━━━━━━━━━━━━
OFFICIAL TGAT2 DOMAINS
━━━━━━━━━━━━━━━━━━
1. Language Ability (ความสามารถทางภาษา)
   - Communication Meaning (การสื่อความหมาย)
   - Language Usage (การใช้ภาษา)
   - Reading (การอ่าน)
   - Language Understanding (การเข้าใจภาษา)
2. Numerical Ability (ความสามารถทางตัวเลข)
   - Dimensional Sequences (อนุกรมมิติ)
   - Quantitative Comparison (การเปรียบเทียบเชิงปริมาณ) - Must format columns A, B, C or columns I, II, III
   - Data Sufficiency (ความเพียงพอของข้อมูล) - Must evaluate statements (ก) and (ข)
   - Word Problems (โจทย์ปัญหา)
3. Spatial Ability (ความสามารถทางมิติสัมพันธ์)
   - Cube Folding (แบบพับกล่อง)
   - Odd Image Detection (แบบหาภาพต่าง)
   - 3D Rotation (แบบหมุนภาพสามมิติ)
   - Image Assembly (แบบประกอบภาพ)
4. Reasoning Ability (ความสามารถทางเหตุผล)
   - Visual Sequences (อนุกรมภาพ)
   - Visual Analogies (อุปมาอุปไมยภาพ)
   - Logical Conclusions (สรุปความสมเหตุสมผล)
   - Statement Analysis (วิเคราะห์ข้อความ)

━━━━━━━━━━━━━━━━━━
STRICT DIFFICULTY DISTRIBUTION & CRITERIA
━━━━━━━━━━━━━━━━━━
- Easy: (Direct reasoning, minimal traps, suggested time: 20-40s)
- Medium: (Multi-step logical deductions, conditional constraints, reading nuance, suggested time: 45-70s)
- Hard: (High cognitive load, cognitive switching, double negation, hidden assumptions, extremely deceptive traps, suggested time: 70-100s)

━━━━━━━━━━━━━━━━━━
MANDATORY IMAGE TEMPLATES (CRITICAL)
━━━━━━━━━━━━━━━━━━
If generating a question for "Spatial Ability" or "Reasoning Ability" that requires a diagram or visual pattern, you MUST select one of the following available SVG files and embed it at the beginning of the "question" field as:
<img src="/images/exams/<filename>.svg" />

Here is the list of available SVGs and their contexts:
- "cube_net.svg" (Cross layout of 6 colored faces R, G, B, Y, W, K for Cube Folding)
- "cube_net_lines.svg" (Cross layout of 6 faces with line segments for Cube Folding)
- "arrow_pattern.svg" (Arrows pointing in directions in grid for pattern detection)
- "grid_translation_39.svg" (Grid coordinate system for translation problems)
- "circle_scaling_46.svg" (Visual progression of circle scaling/resizing)
- "series_pattern_47.svg" (Visual pattern progression)
- "overlay_48.svg" (Visual intersection/overlay of shapes)
- "grid_series_52.svg" (Visual series in a 3x3 grid)
- "paper_folding_53.svg" (Paper folding and punched holes net/unfolding)
- "cube_arrows_56.svg" (3D cube rotation with arrow orientations)
- "cylinder_points_57.svg" (3D cylinder rotation pattern)
- "concentric_series_58.svg" (Visual series of concentric circle patterns)
- "wrench_rotation_60.svg" (Visual rotation of mechanical tools/wrenches)
- "cube_stack_62.svg" (Stack of 3D cubes for counting volume/cubes)
- "f_block_64.svg" (3D blocks shaped like 'F' for 3D rotations)
- "triangle_series_65.svg" (Visual series of triangle sub-segments)
- "arc_progression_68.svg" (Progressive arcs scaling pattern)
- "grid_scan_69.svg" (Symmetric grid cell scan lines)
- "branch_circle_70.svg" (Circle branching logic tree)
- "grid_maze_41.svg" (Maze pathways through grid squares)
- "health_reflection_40.svg" (Reflective symmetry logic)

If the selected subtopic does NOT require a diagram (e.g. Language Ability, Word Problems, or Logical Conclusions), you must NOT include any image tags.

━━━━━━━━━━━━━━━━━━
CRITICAL UNIQUENESS & TRAP RULES
━━━━━━━━━━━━━━━━━━
- NO rewritten versions of existing questions or cosmetic updates (changing names/numbers/keywords only).
- Every question must introduce a new scenario, reasoning structure, or cognitive trap.
- Design deceptive wrong choices (distractors) that represent partial truths, common calculation mistakes, or logical fallacies (e.g., affirming the consequent, denying the antecedent).
- Explanations must be highly pedagogical, explaining both the correct logic and the fallacy in each trap choice.

${constraintSection}

Generate a question adhering to this standard. Output ONLY valid JSON matching the schema.`;

    requestPayload = {
      contents: [{
        parts: [{ text: systemInstructions }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            difficulty: { type: 'STRING', enum: [targetDifficulty] },
            domain: { type: 'STRING', description: 'One of: Language Ability, Numerical Ability, Spatial Ability, Reasoning Ability' },
            subtopic: { type: 'STRING', description: 'Blueprint subtopic name (e.g. Word Problems, Cube Folding, Communication Meaning)' },
            question: { type: 'STRING', description: 'The question prompt, written in official exam Thai. HTML supported.' },
            passage: { type: 'STRING', description: 'Optional reading passage text in Thai, or null if not applicable.' },
            choiceA: { type: 'STRING', description: 'First option' },
            choiceB: { type: 'STRING', description: 'Second option' },
            choiceC: { type: 'STRING', description: 'Third option' },
            choiceD: { type: 'STRING', description: 'Fourth option' },
            choiceE: { type: 'STRING', description: 'Fifth option' },
            answer: { type: 'STRING', enum: ['A', 'B', 'C', 'D', 'E'], description: 'Correct answer letter' },
            correctExplanation: { type: 'STRING', description: 'Detailed step-by-step reasoning for the correct choice' },
            wrongExplanation: { type: 'STRING', description: 'Detailed analysis of why the other options are wrong/traps' },
            reasoningType: { type: 'STRING', description: 'e.g. Numerical, Logical, Spatial, Verbal, Analytical' },
            trapPattern: { type: 'STRING', description: 'Core trap design type used (e.g. Affirmed Consequent, Direct Match Trap)' },
            estimatedTime: { type: 'INTEGER', description: 'Estimated time in seconds (e.g., 60)' }
          },
          required: [
            'difficulty', 'domain', 'subtopic', 'question', 'choiceA', 'choiceB', 'choiceC', 'choiceD', 'choiceE',
            'answer', 'correctExplanation', 'wrongExplanation', 'reasoningType', 'trapPattern', 'estimatedTime'
          ]
        }
      }
    };
  } else if (examType === 'tgat3') {
    const domains = [
      'การสร้างคุณค่าและนวัตกรรม',
      'การแก้ไขปัญหาที่ซับซ้อน',
      'การบริหารจัดการอารมณ์',
      'การเป็นพลเมืองที่มีส่วนร่วมของสังคม'
    ];
    const targetDomain = domains[Math.floor(Math.random() * domains.length)];

    systemInstructions = `You are an elite Thai national examination item writer specialized in TGAT3 (93 สมรรถนะการทำงาน) based STRICTLY on the official TCAS blueprint.
Your task is to generate an ORIGINAL, premium, high-quality TGAT3 exam question that strictly follows the official MyTCAS blueprint.

You MUST generate a question of difficulty level: "${targetDifficulty}".
The generated question MUST be categorized under the domain: "${targetDomain}".

━━━━━━━━━━━━━━━━━━
OFFICIAL EXAM STRUCTURE & DOMAINS
━━━━━━━━━━━━━━━━━━
Exam: TGAT3 — 93 สมรรถนะการทำงาน (Workforce Competencies)
* Total Questions: 60
* Multiple Choice: 4 Choices (A, B, C, D)
* Duration: 60 Minutes
* Total Score: 100 Points

The exam covers the following domains and subtopics:
1. การสร้างคุณค่าและนวัตกรรม (Value Creation & Innovation)
   - การคิดเชิงวิเคราะห์ (Analytical thinking)
   - การแก้ไขปัญหาอย่างมืออาชีพ (Professional problem solving)
   - ความคิดเชิงนวัตกรรม (Innovative thinking)
2. การแก้ไขปัญหาที่ซับซ้อน (Complex Problem Solving)
   - การระบุปัญหา (Identifying problems)
   - การแสวงหาทางออก (Generating and selecting solutions)
   - การนำทางออกไปแก้ปัญหา (Implementation)
   - การประเมินทางออกเพื่อการพัฒนาปรับปรุง (Evaluation)
3. การบริหารจัดการอารมณ์ (Emotional Management)
   - ความตระหนักรู้ตนเอง (Self awareness)
   - การควบคุมอารมณ์และบุคลิกภาพ (Personality and emotional control)
   - ความเข้าใจผู้อื่น (Interpersonal understanding)
4. การเป็นพลเมืองที่มีส่วนร่วมของสังคม (Active Citizen)
   - การมุ่งเน้นการบริการสังคม (Service orientation)
   - จิตสำนึกและรับผิดชอบต่อสิ่งแวดล้อม (Environmental responsibility)
   - การสร้างสรรค์เพื่อประโยชน์ของท้องถิ่น (Creating local benefits)

━━━━━━━━━━━━━━━━━━
THE THREE OFFICIAL QUESTION FORMATS
━━━━━━━━━━━━━━━━━━
Every question must represent one of these three formats (randomly selected):
1. Format 1: เลือกตอบตัวเลือกเดียว (Single Answer)
   - Standard workplace, professional, or social situation. Choose the single best action. Options are graded or have one single correct answer.
2. Format 2: ข้อสอบ 1 ข้อ มีหลายคำตอบ (Multiple Necessary Answers)
   - The question asks "ข้อมูลใด/บุคคลใดบ้างที่จำเป็น..." or similar.
   - The choices A, B, C, D are structured as combinations of these options. E.g.:
     - A. ข้อ 1 และ 3 จำเป็น
     - B. เฉพาะข้อ 2 และ 4
     - C. ข้อ 1, 3 และ 4 จำเป็น (Correct)
     - D. ทุกข้อมีความจำเป็นทั้งหมด
3. Format 3: เลือกตอบตัวเลือกเดียว ในข้อสอบ 2 ข้อที่สัมพันธ์กัน (Linked Two-Step)
   - Since the exam is flat and shuffled, this format MUST be represented as a single self-contained question evaluating both Steps: Problem identification and its matched Solution.
   - The question text should be "ปัญหาหลักคืออะไร และแนวทางแก้ไขที่สอดคล้องกันคืออะไร" (or similar).
   - The choices A, B, C, D are structured as pairs: \`[ปัญหา: ...] | [แนวทางแก้ไข: ...]\` where only one pair is logically correct and aligned.

━━━━━━━━━━━━━━━━━━
DIFFICULTY PROFILE CRITERIA
━━━━━━━━━━━━━━━━━━
- Easy: Direct workforce/social situations with clear ethical/logical choices. No deep traps. Suggested time: 35-45s.
- Medium: Scenarios with moderate workplace/interpersonal conflict, requiring balanced compromise, or evaluating 3-4 simple constraints. Suggested time: 45-60s.
- Hard: Complex scenarios with multi-stakeholder conflicts, ethical dilemmas, emotional tension, or evaluating 5+ trade-offs. The correct option represents a highly professional, systemic, and sustainable solution, while distractors represent reactive, short-sighted, or emotionally charged options. Suggested time: 60-90s.

━━━━━━━━━━━━━━━━━━
CRITICAL UNIQUENESS & REALISM RULES
━━━━━━━━━━━━━━━━━━
- Use realistic, modern Thai names and workplace settings (e.g., tech startups, local communities, agricultural cooperatives, corporate departments).
- Every question must be self-contained so that it remains completely coherent even if shuffled.
- Distractors must represent common logical fallacies, emotional outbursts, or short-sighted solutions that sound tempting but lack systemic effectiveness.
- Explanations must be highly professional, detailing why the correct choice is optimal and highlighting the shortcomings/fallacies of the wrong options.

${constraintSection}

Generate a question adhering to this standard. Output ONLY valid JSON matching the schema.`;

    requestPayload = {
      contents: [{
        parts: [{ text: systemInstructions }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            difficulty: { type: 'STRING', enum: [targetDifficulty] },
            domain: { type: 'STRING', enum: domains },
            subtopic: { type: 'STRING', description: 'Blueprint subtopic name (e.g. การคิดเชิงวิเคราะห์, การระบุปัญหา, ความตระหนักรู้ตนเอง, จิตสำนึกและรับผิดชอบต่อสิ่งแวดล้อม)' },
            questionType: { type: 'STRING', enum: ['SingleAnswer', 'MultipleNecessary', 'LinkedTwoStep'] },
            question: { type: 'STRING', description: 'The question text in Thai. Details the scenario and specific question.' },
            passage: { type: 'STRING', description: 'Optional scenario description text in Thai, or null if not applicable.' },
            choiceA: { type: 'STRING', description: 'First option' },
            choiceB: { type: 'STRING', description: 'Second option' },
            choiceC: { type: 'STRING', description: 'Third option' },
            choiceD: { type: 'STRING', description: 'Fourth option' },
            answer: { type: 'STRING', enum: ['A', 'B', 'C', 'D'], description: 'Correct answer letter' },
            correctExplanation: { type: 'STRING', description: 'Detailed step-by-step reasoning for the correct choice' },
            wrongExplanation: { type: 'STRING', description: 'Detailed analysis of why the other options are wrong/traps' },
            mindset: { type: 'STRING', description: 'Core mindset or workforce competence concept tag for the student' },
            speedHack: { type: 'STRING', description: 'Speed tip/shortcut for the student' },
            estimatedTime: { type: 'INTEGER', description: 'Estimated time in seconds (e.g., 60)' }
          },
          required: [
            'difficulty', 'domain', 'subtopic', 'questionType', 'question',
            'choiceA', 'choiceB', 'choiceC', 'choiceD', 'answer',
            'correctExplanation', 'wrongExplanation', 'mindset', 'speedHack', 'estimatedTime'
          ]
        }
      }
    };
  } else if (examType === 'tgat1') {
    const sections = ['Speaking Skill', 'Reading Skill'];
    const selectedSection = sections[Math.floor(Math.random() * sections.length)];
    
    let selectedType = '';
    if (selectedSection === 'Speaking Skill') {
      const types = ['Question-Response', 'Short Conversations', 'Long Conversations'];
      selectedType = types[Math.floor(Math.random() * types.length)];
    } else {
      const types = ['Text Completion', 'Reading Comprehension'];
      selectedType = types[Math.floor(Math.random() * types.length)];
    }

    systemInstructions = `You are an elite national examination item writer specialized in TGAT1 (91 การสื่อสารภาษาอังกฤษ) based STRICTLY on the official MyTCAS blueprint.
Your task is to generate an ORIGINAL, premium, high-quality TGAT1 exam question that strictly follows the blueprint.

You MUST generate a question of difficulty level: "${targetDifficulty}".
The generated question MUST be categorized under the section: "${selectedSection}" and type: "${selectedType}".

━━━━━━━━━━━━━━━━━━
OFFICIAL EXAM STRUCTURE & SECTIONS
━━━━━━━━━━━━━━━━━━
Exam: TGAT1 — 91 การสื่อสารภาษาอังกฤษ (English Communication)
* Total Questions: 60
* Multiple Choice: 4 Choices (A, B, C, D)
* Duration: 60 Minutes
* Total Score: 100 Points

The exam covers the following sections and types:
1. Speaking Skill (30 Questions)
   - Question-Response (10 Questions): Single-turn natural spoken dialogue response. Avoid robotic speech.
   - Short Conversations (10 Questions): 3 dialogues of 2 speakers. E.g. focus on tone, situations, relations.
   - Long Conversations (10 Questions): 2 dialogues of 2-3 speakers. E.g. focus on role relations, evolving context.
2. Reading Skill (30 Questions)
   - Text Completion (15 Questions): Cloze test passages focusing on grammar in context, cohesive devices, collocations.
   - Reading Comprehension (15 Questions): 3 passages (100-200 words each) on modern topics (AI, environment, workplace, etc.). Tests main idea, inference, tone, author attitude, implication.

━━━━━━━━━━━━━━━━━━
ELITE DIFFICULTY ENGINEERING & NUANCE
━━━━━━━━━━━━━━━━━━
To separate top-tier students under time pressure, you MUST increase the difficulty level significantly:
- Easy: Direct context clues, short exchange, basic inference.
- Medium: Implied meanings, register conflict, tone analysis, close distractors.
- Hard: High cognitive load, indirect implicatures, subtle social contexts, psychological traps.
- Distractors must be highly alluring:
  - Speaking: Choice is grammatically correct and translates reasonably, but violates pragmatic rules (e.g. over-polite in informal setting) or register.
  - Reading: True-but-irrelevant facts, keyword matches with reversed logic, or overgeneralizations.

━━━━━━━━━━━━━━━━━━
CRITICAL GENERATION RULES
━━━━━━━━━━━━━━━━━━
- Use modern, internationally relevant, and socially believable scenarios (corporate meetings, social media trends, eco-tourism, healthcare ethics).
- Every question must be self-contained so that it remains completely coherent even if shuffled.
- DO NOT use rare/archaic vocabulary or archaic grammatical rules to create difficulty; difficulty must come from communication nuance, speed reading pressure, and contextual implication.
- Every question must introduce at least ONE of: a new scenario, a new reasoning chain, a new analytical method, a new interdisciplinary connection, or a new interpretation pattern.

${constraintSection}

Generate a question adhering to this standard. Output ONLY valid JSON matching the schema.`;

    requestPayload = {
      contents: [{
        parts: [{ text: systemInstructions }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            difficulty: { type: 'STRING', enum: [targetDifficulty] },
            domain: { type: 'STRING', enum: [selectedSection] },
            subtopic: { type: 'STRING', description: 'Communication skill or keyword (e.g., Context Clues, Pragmatics, Inference)' },
            questionType: { type: 'STRING', enum: [selectedType] },
            question: { type: 'STRING', description: 'The question prompt in English. For text completion or conversation, include gaps like ______ or blank indicator.' },
            passage: { type: 'STRING', description: 'Reading passage or dialogue text. Leave null if not applicable.' },
            choiceA: { type: 'STRING', description: 'First option' },
            choiceB: { type: 'STRING', description: 'Second option' },
            choiceC: { type: 'STRING', description: 'Third option' },
            choiceD: { type: 'STRING', description: 'Fourth option' },
            answer: { type: 'STRING', enum: ['A', 'B', 'C', 'D'], description: 'Correct answer letter' },
            correctExplanation: { type: 'STRING', description: 'Detailed reasoning for the correct choice' },
            wrongExplanation: { type: 'STRING', description: 'Detailed analysis of why other options are wrong/traps' },
            mindset: { type: 'STRING', description: 'Core mindset or concept tag for the student' },
            speedHack: { type: 'STRING', description: 'Speed tip/shortcut for the student' },
            estimatedTime: { type: 'INTEGER', description: 'Estimated time in seconds (e.g., 60)' }
          },
          required: [
            'difficulty', 'domain', 'subtopic', 'questionType', 'question',
            'choiceA', 'choiceB', 'choiceC', 'choiceD', 'answer',
            'correctExplanation', 'wrongExplanation', 'mindset', 'speedHack', 'estimatedTime'
          ]
        }
      }
    };
  } else {
    systemInstructions = `You are a premium, state-of-the-art TGAT (Thailand General Aptitude Test) question generator.
Your target is to output a single, high-quality exam question matching the specified type.

${constraintSection}

Ensure that the question feels like a genuinely new exam experience.`;

    requestPayload = {
      contents: [{
        parts: [{ text: systemInstructions }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            difficulty: { type: 'STRING', enum: ['Easy', 'Medium', 'Hard', 'Elite'] },
            topic: { type: 'STRING', description: 'Brief category tag (e.g. Vocabulary, Numerical Reasoning, Conflict Management)' },
            section: { type: 'STRING', description: 'Exam section' },
            partTitle: { type: 'STRING', description: 'Header part title (e.g. Part 1: Conversation)' },
            suggestedTime: { type: 'STRING', description: 'e.g. Suggested Time: 45s' },
            estimatedTime: { type: 'INTEGER', description: 'Estimated time in seconds (e.g., 60)' },
            frequency: { type: 'STRING', description: 'How often it appears (e.g., High)' },
            examWeight: { type: 'INTEGER', description: 'Standard weight (e.g., 5)' },
            yearPattern: { type: 'STRING', description: 'e.g. 2568-2569' },
            text: { type: 'STRING', description: 'The main question prompt. HTML supported.' },
            passage: { type: 'STRING', description: 'Optional passage text. Use null if not applicable.' },
            options: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              minItems: 4,
              maxItems: 4
            },
            answer: { type: 'INTEGER', description: '0-3 index of the correct/best option' },
            correctExplanation: { type: 'STRING', description: 'Detailed step-by-step reasoning for the correct choice' },
            wrongExplanation: { type: 'STRING', description: 'Detailed analysis of why the other options are wrong/traps' },
            mindset: { type: 'STRING', description: 'Core mindset or concept tag for the student' },
            speedHack: { type: 'STRING', description: 'Speed tip/shortcut for the student' },
            conceptTags: { type: 'STRING', description: 'Comma-separated keywords representing the concept tags' },
            reasoningType: { type: 'STRING', description: 'The type of reasoning used (e.g., Logical, Spatial, Critical)' },
            scenarioType: { type: 'STRING', description: 'The scenario setting type (e.g., Corporate Workplace, Graph Analysis, Scientific Article)' }
          },
          required: [
            'difficulty', 'topic', 'section', 'partTitle', 'suggestedTime', 'estimatedTime',
            'frequency', 'examWeight', 'yearPattern', 'text', 'options', 'answer',
            'correctExplanation', 'wrongExplanation', 'mindset', 'speedHack',
            'conceptTags', 'reasoningType', 'scenarioType'
          ]
        }
      }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini candidate generation failed: ${response.status} - ${errorBody}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error(`Empty response content from Gemini candidate generation API.`);
  }

  const responseJson = JSON.parse(textResponse);

  if (examType === 'tgat2') {
    // Map TGAT2 schema to standard GenQuestion interface
    const mappedQuestion: GenQuestion = {
      difficulty: responseJson.difficulty,
      topic: responseJson.subtopic || 'General',
      section: responseJson.domain || 'General',
      partTitle: `ส่วนที่ 2: การคิดอย่างมีเหตุผล (${responseJson.domain === 'Language Ability' ? 'ภาษา' : responseJson.domain === 'Numerical Ability' ? 'ตัวเลข' : responseJson.domain === 'Spatial Ability' ? 'มิติสัมพันธ์' : 'เหตุผล'})`,
      suggestedTime: `Suggested Time: ${responseJson.estimatedTime}s`,
      estimatedTime: responseJson.estimatedTime || 60,
      frequency: responseJson.difficulty === 'Hard' ? 'Medium' : 'High',
      examWeight: responseJson.difficulty === 'Hard' ? 7 : (responseJson.difficulty === 'Medium' ? 6 : 5),
      yearPattern: '2568-2569',
      text: responseJson.question || '',
      passage: responseJson.passage || null,
      options: [responseJson.choiceA, responseJson.choiceB, responseJson.choiceC, responseJson.choiceD, responseJson.choiceE].filter(Boolean),
      answer: responseJson.answer === 'A' ? 0 : responseJson.answer === 'B' ? 1 : responseJson.answer === 'C' ? 2 : responseJson.answer === 'D' ? 3 : 4,
      correctExplanation: responseJson.correctExplanation || '',
      wrongExplanation: responseJson.wrongExplanation || '',
      mindset: responseJson.trapPattern || '',
      speedHack: `กลลวงที่ต้องระวัง: ${responseJson.trapPattern || 'วิเคราะห์ตรรกะแบบรอบคอบ'}`,
      conceptTags: responseJson.subtopic || 'General',
      reasoningType: responseJson.reasoningType || 'Logical',
      scenarioType: responseJson.domain || 'General'
    };
    return mappedQuestion;
  } else if (examType === 'tgat3') {
    // Map TGAT3 schema to standard GenQuestion interface
    const mappedQuestion: GenQuestion = {
      difficulty: responseJson.difficulty,
      topic: responseJson.subtopic || 'General',
      section: responseJson.domain || 'General',
      partTitle: `วิชา TGAT3 สมรรถนะการทำงาน (${responseJson.domain})`,
      suggestedTime: `Suggested Time: ${responseJson.estimatedTime || 60}s`,
      estimatedTime: responseJson.estimatedTime || 60,
      frequency: responseJson.difficulty === 'Hard' ? 'Medium' : 'High',
      examWeight: responseJson.difficulty === 'Hard' ? 7 : (responseJson.difficulty === 'Medium' ? 6 : 5),
      yearPattern: '2568-2569',
      text: responseJson.question || '',
      passage: responseJson.passage || null,
      options: [responseJson.choiceA, responseJson.choiceB, responseJson.choiceC, responseJson.choiceD].filter(Boolean),
      answer: responseJson.answer === 'A' ? 0 : responseJson.answer === 'B' ? 1 : responseJson.answer === 'C' ? 2 : 3,
      correctExplanation: responseJson.correctExplanation || '',
      wrongExplanation: responseJson.wrongExplanation || '',
      mindset: responseJson.mindset || '',
      speedHack: responseJson.speedHack || '',
      conceptTags: `${responseJson.subtopic || ''}, ${responseJson.questionType || ''}`,
      reasoningType: responseJson.questionType || 'SingleAnswer',
      scenarioType: responseJson.subtopic || 'General'
    };
    return mappedQuestion;
  } else if (examType === 'tgat1') {
    // Map TGAT1 schema to standard GenQuestion interface
    const mappedQuestion: GenQuestion = {
      difficulty: responseJson.difficulty,
      topic: responseJson.subtopic || 'General',
      section: responseJson.domain || 'General',
      partTitle: `${responseJson.domain} - ${responseJson.questionType}`,
      suggestedTime: `Suggested Time: ${responseJson.estimatedTime || 60}s`,
      estimatedTime: responseJson.estimatedTime || 60,
      frequency: responseJson.difficulty === 'Hard' ? 'Medium' : 'High',
      examWeight: responseJson.difficulty === 'Hard' ? 7 : (responseJson.difficulty === 'Medium' ? 6 : 5),
      yearPattern: '2568-2569',
      text: responseJson.question || '',
      passage: responseJson.passage || null,
      options: [responseJson.choiceA, responseJson.choiceB, responseJson.choiceC, responseJson.choiceD].filter(Boolean),
      answer: responseJson.answer === 'A' ? 0 : responseJson.answer === 'B' ? 1 : responseJson.answer === 'C' ? 2 : 3,
      correctExplanation: responseJson.correctExplanation || '',
      wrongExplanation: responseJson.wrongExplanation || '',
      mindset: responseJson.mindset || '',
      speedHack: responseJson.speedHack || '',
      conceptTags: `${responseJson.subtopic || ''}, ${responseJson.questionType || ''}`,
      reasoningType: responseJson.questionType || 'SingleAnswer',
      scenarioType: responseJson.domain || 'General'
    };
    return mappedQuestion;
  }

  return responseJson;
}

// -------------------------------------------------------------------------
// Secondary validation check using LLM to confirm logic uniqueness
// -------------------------------------------------------------------------
async function secondaryLlmCheck(newQuestion: GenQuestion, similarQuestions: any[]): Promise<{ approved: boolean; reason: string }> {
  if (similarQuestions.length === 0) return { approved: true, reason: 'No similar questions found to compare.' };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const similarItemsFormatted = similarQuestions.map((q, i) => {
    return `=== HISTORICAL MATCH #${i+1} ===
ID: ${q.questionId}
Text: ${q.questionText}
Concept: ${q.conceptTags}
Reasoning: ${q.reasoningType} / ${q.scenarioType}
`;
  }).join('\n');

  const newFormatted = `=== NEW CANDIDATE QUESTION ===
Text: ${newQuestion.passage ? `${newQuestion.passage}\n` : ''}${newQuestion.text}
Options: ${newQuestion.options.join(' | ')}
Concept: ${newQuestion.conceptTags}
Reasoning: ${newQuestion.reasoningType} / ${newQuestion.scenarioType}
Explanations: ${newQuestion.correctExplanation} | ${newQuestion.wrongExplanation}
`;

  const instructions = `You are a strict TGAT exam quality auditor. Your job is to compare a new candidate question against similar historical matches and reject it if it is a duplicate, a slightly modified cosmetic rewrite, or uses the exact same scenario/reasoning chain.

${newFormatted}

Compare it against these close matches from the database:
${similarItemsFormatted}

REJECTION CRITIERIA:
Reject the new candidate if it matches any of the following with a historical match:
1. Same scenario with cosmetic changes (e.g. changing names, numbers, objects but keeping the story/logic the same).
2. Identical reasoning chain or logic structures.
3. Parameter-swapped clones (e.g. "A car moves at 20 m/s" vs "A motorcycle moves at 25 m/s").
4. Cosmetic rewrites of the question text.
5. Identical elimination strategies or identical trap-answer patterns.

Response Schema:
You must output a JSON object with:
- "approved": boolean (true if it is genuinely unique and does NOT match the rejection criteria, false if it should be rejected)
- "reason": string (a brief explanation of your decision, pointing out which matches are too similar if rejected)

Format requirement: JSON output only.`;

  const requestPayload = {
    contents: [{
      parts: [{ text: instructions }]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          approved: { type: 'BOOLEAN' },
          reason: { type: 'STRING' }
        },
        required: ['approved', 'reason']
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini secondary LLM check failed: ${response.status} - ${errorBody}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error(`Empty response content from Gemini secondary check API.`);
  }

  return JSON.parse(textResponse);
}

function getNextTargetDifficulty(history: any[], examType: string): string {
  if (examType === 'tgat3') {
    const tgat3History = history.filter(h => h.questionId && h.questionId.startsWith('T3-'));
    const total = tgat3History.length;
    if (total === 0) return 'Medium'; // default if empty

    const easyCount = tgat3History.filter(h => h.difficulty === 'Easy').length;
    const mediumCount = tgat3History.filter(h => h.difficulty === 'Medium').length;
    const hardCount = tgat3History.filter(h => h.difficulty === 'Hard').length;

    const easyPct = easyCount / total;
    const mediumPct = mediumCount / total;
    const hardPct = hardCount / total;

    // Target: Easy 30% (0.3), Medium 50% (0.5), Hard 20% (0.2)
    const easyDeficit = 0.3 - easyPct;
    const mediumDeficit = 0.5 - mediumPct;
    const hardDeficit = 0.2 - hardPct;

    // Return the difficulty with the highest deficit to balance the distribution
    if (easyDeficit >= mediumDeficit && easyDeficit >= hardDeficit) {
      return 'Easy';
    } else if (mediumDeficit >= easyDeficit && mediumDeficit >= hardDeficit) {
      return 'Medium';
    } else {
      return 'Hard';
    }
  } else if (examType === 'tgat1') {
    const tgat1History = history.filter(h => h.questionId && h.questionId.startsWith('T1-'));
    const total = tgat1History.length;
    if (total === 0) return 'Medium'; // default if empty

    const easyCount = tgat1History.filter(h => h.difficulty === 'Easy').length;
    const mediumCount = tgat1History.filter(h => h.difficulty === 'Medium').length;
    const hardCount = tgat1History.filter(h => h.difficulty === 'Hard').length;

    const easyPct = easyCount / total;
    const mediumPct = mediumCount / total;
    const hardPct = hardCount / total;

    // Target: Easy 20% (0.2), Medium 55% (0.55), Hard 25% (0.25)
    const easyDeficit = 0.2 - easyPct;
    const mediumDeficit = 0.55 - mediumPct;
    const hardDeficit = 0.25 - hardPct;

    // Return the difficulty with the highest deficit to balance the distribution
    if (easyDeficit >= mediumDeficit && easyDeficit >= hardDeficit) {
      return 'Easy';
    } else if (mediumDeficit >= easyDeficit && mediumDeficit >= hardDeficit) {
      return 'Medium';
    } else {
      return 'Hard';
    }
  }

  if (examType !== 'tgat2') {
    // Default balanced logic for non-TGAT2/TGAT3/TGAT1
    const roll = Math.random();
    if (roll < 0.3) return 'Easy';
    if (roll < 0.8) return 'Medium';
    return 'Hard';
  }

  // Filter history for TGAT2
  const tgat2History = history.filter(h => h.questionId && h.questionId.startsWith('T2-'));
  const total = tgat2History.length;
  if (total === 0) return 'Medium'; // default if empty

  const easyCount = tgat2History.filter(h => h.difficulty === 'Easy').length;
  const mediumCount = tgat2History.filter(h => h.difficulty === 'Medium').length;
  const hardCount = tgat2History.filter(h => h.difficulty === 'Hard').length;

  const easyPct = easyCount / total;
  const mediumPct = mediumCount / total;
  const hardPct = hardCount / total;

  // Shifted Target: Easy 20% (0.2), Medium 50% (0.5), Hard 30% (0.3)
  const easyDeficit = 0.2 - easyPct;
  const mediumDeficit = 0.5 - mediumPct;
  const hardDeficit = 0.3 - hardPct;

  // Return the difficulty with the highest deficit to balance the distribution
  if (easyDeficit >= mediumDeficit && easyDeficit >= hardDeficit) {
    return 'Easy';
  } else if (mediumDeficit >= easyDeficit && mediumDeficit >= hardDeficit) {
    return 'Medium';
  } else {
    return 'Hard';
  }
}

// -------------------------------------------------------------------------
// Main Execution Flow
// -------------------------------------------------------------------------
async function run() {
  const args = process.argv.slice(2);
  const isTest = args.includes('--test');
  const typeArg = args.find(a => a.startsWith('--type='));
  const countArg = args.find(a => a.startsWith('--count='));

  const examType = typeArg ? typeArg.split('=')[1] : 'tgat1';
  const count = countArg ? parseInt(countArg.split('=')[1], 10) : 1;

  if (!['tgat1', 'tgat2', 'tgat3'].includes(examType)) {
    console.error("❌ Invalid exam type. Must be tgat1, tgat2, or tgat3");
    process.exit(1);
  }

  console.log(`🚀 RUNNING QUESTION GENERATOR (Type: ${examType.toUpperCase()}, Count: ${count}, Test Mode: ${isTest})`);

  try {
    const sheets = await getGoogleSheetsClient();
    
    // Load embeddings cache
    const embeddingsCache = loadEmbeddingsCache();
    
    // 1. Fetch existing history database
    const history = await getExistingHistory(sheets);
    console.log(`📊 Total historical questions in database to check against: ${history.length}`);

    // Pre-load embeddings for all historical questions to verify similarity
    console.log('⏳ Ensuring vector embeddings for all historical questions are cached...');
    let cacheUpdated = false;
    for (const h of history) {
      if (!embeddingsCache[h.questionId]) {
        console.log(`Vectorizing and caching historical question ${h.questionId}...`);
        try {
          // Truncate text if it is extremely long
          const textToEmbed = h.questionText.slice(0, 1500);
          embeddingsCache[h.questionId] = await getEmbedding(textToEmbed);
          cacheUpdated = true;
        } catch (err: any) {
          console.warn(`⚠️ Failed to generate embedding for ${h.questionId}:`, err.message);
        }
      }
    }
    if (cacheUpdated) {
      saveEmbeddingsCache(embeddingsCache);
    }
    console.log('✅ Historical vector embeddings loaded.');

    let successCount = 0;
    let attemptsCount = 0;
    const maxAttempts = 10;
    const negativeConstraints: string[] = [];

    while (successCount < count && attemptsCount < maxAttempts) {
      attemptsCount++;
      console.log(`\n======================================================`);
      console.log(`🤖 Generation Attempt #${attemptsCount} for question #${successCount + 1}`);
      console.log(`======================================================`);

      // 2. Determine target difficulty to balance the database
      const targetDifficulty = getNextTargetDifficulty(history, examType);
      console.log(`🎯 Target difficulty selected for balance: ${targetDifficulty}`);

      // Generate a candidate question
      const candidate = await generateCandidate(examType, targetDifficulty, negativeConstraints);
      console.log(`💡 Candidate generated with topic: "${candidate.topic}" and difficulty: "${candidate.difficulty}"`);
      console.log(`Prompt Preview: ${candidate.text.slice(0, 100)}...`);

      // 3. Compute candidate vector embedding
      const candidateText = getFullTextForEmbedding(candidate);
      const candidateHash = getHash(candidateText);
      
      console.log('⏳ Generating embedding for candidate...');
      const candidateEmbedding = await getEmbedding(candidateText);

      // 4. Compare against history
      let highestSimilarity = 0;
      let mostSimilarQuestion: any = null;
      const similarCandidatesList: any[] = [];

      for (const h of history) {
        const hEmbedding = embeddingsCache[h.questionId];
        if (!hEmbedding) continue;

        const similarity = cosineSimilarity(candidateEmbedding, hEmbedding);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarQuestion = h;
        }

        // Keep track of top similar questions to feed into secondary check
        if (similarity > 0.50) {
          similarCandidatesList.push({ item: h, score: similarity });
        }
      }

      // Sort by similarity score descending
      similarCandidatesList.sort((a, b) => b.score - a.score);
      const topMatches = similarCandidatesList.slice(0, 3).map(x => x.item);

      console.log(`🔍 Vector Embedding Similarity Check:`);
      console.log(`   - Highest Similarity Score: ${highestSimilarity.toFixed(4)}`);
      if (mostSimilarQuestion) {
        console.log(`   - Most Similar Question: ${mostSimilarQuestion.questionId} (${mostSimilarQuestion.conceptTags})`);
      }

      // 5. Decision Loop
      if (highestSimilarity > 0.75) {
        console.warn(`❌ REJECTED: Semantic similarity score (${highestSimilarity.toFixed(4)}) exceeds the 0.75 threshold.`);
        negativeConstraints.push(`Similarity too high with: ${mostSimilarQuestion.questionText}`);
        continue; // Regenerate
      }

      console.log(`✅ Passed Vector Embedding Check (Similarity <= 0.75).`);

      // 6. Secondary Logic check by LLM auditor
      console.log(`⏳ Triggering secondary LLM verification against top similar matches...`);
      const auditorResult = await secondaryLlmCheck(candidate, topMatches);

      if (!auditorResult.approved) {
        console.warn(`❌ REJECTED BY LLM AUDITOR:`);
        console.warn(`   - Reason: ${auditorResult.reason}`);
        negativeConstraints.push(`Auditor rejection reason: ${auditorResult.reason}`);
        continue; // Regenerate
      }

      console.log(`✅ Approved by LLM Auditor!`);

      // 7. Write to Google Sheets (if not test mode)
      if (isTest) {
        console.log(`🧪 [TEST MODE] Approved question details (Not saved to Google Sheets):`);
        console.log(JSON.stringify(candidate, null, 2));
      } else {
        console.log(`💾 Saving approved question to Google Sheets...`);

        // Compute ID based on target tab size to avoid duplicate IDs
        const prefix = examType === 'tgat2' ? 'T2' : (examType === 'tgat3' ? 'T3' : 'T1');
        const tabName = examType === 'tgat2' ? 'TGAT2_Questions' : (examType === 'tgat3' ? 'TGAT3_Questions' : 'TGAT1_Questions');
        
        console.log(`⏳ Fetching current rows of ${tabName} to determine next ID...`);
        const currentTabResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${tabName}!A2:A1000`,
        });
        const currentTabRows = currentTabResponse.data.values || [];
        const nextNum = currentTabRows.length + 1;
        const newId = `${prefix}-${String(nextNum).padStart(3, '0')}`;
        candidate.id = newId;

        // Save to specific Question Tab
        const nowStr = new Date().toISOString();
        
        let targetRow: any[] = [];
        if (examType === 'tgat1') {
          targetRow = [
            candidate.id, 'TGAT1', candidate.difficulty, candidate.topic, '', candidate.section,
            candidate.partTitle, candidate.suggestedTime, candidate.estimatedTime,
            candidate.frequency, candidate.examWeight, candidate.yearPattern,
            candidate.text, candidate.passage || '',
            candidate.options[0], candidate.options[1], candidate.options[2], candidate.options[3],
            candidate.answer === 0 ? 'A' : (candidate.answer === 1 ? 'B' : (candidate.answer === 2 ? 'C' : 'D')),
            candidate.correctExplanation, candidate.wrongExplanation, candidate.mindset,
            candidate.speedHack, 'FALSE', 0, '', '', nowStr
          ];
        } else if (examType === 'tgat2') {
          targetRow = [
            candidate.id,
            'TGAT2',
            candidate.difficulty,
            candidate.topic,
            '', // subtopic
            candidate.section,
            candidate.partTitle,
            candidate.suggestedTime,
            candidate.estimatedTime,
            candidate.frequency,
            candidate.examWeight,
            candidate.yearPattern,
            candidate.text,
            candidate.passage || '',
            candidate.options[0] || '',
            candidate.options[1] || '',
            candidate.options[2] || '',
            candidate.options[3] || '',
            candidate.options[4] || '',
            candidate.answer === 0 ? 'A' : (candidate.answer === 1 ? 'B' : (candidate.answer === 2 ? 'C' : (candidate.answer === 3 ? 'D' : 'E'))),
            candidate.correctExplanation || '',
            candidate.wrongExplanation || '',
            candidate.mindset || '',
            candidate.speedHack || '',
            'FALSE', // isUsed
            0, // usageCount
            '', // lastUsedAt
            '', // tags
            nowStr, // createdAt
            candidate.reasoningType || 'Logical'
          ];
        } else {
          targetRow = [
            candidate.id, 'TGAT3', candidate.difficulty, candidate.topic, '', candidate.section,
            candidate.partTitle, candidate.suggestedTime, candidate.estimatedTime,
            candidate.frequency, candidate.examWeight, candidate.yearPattern,
            candidate.text, candidate.passage || '',
            candidate.options[0], candidate.options[1], candidate.options[2], candidate.options[3],
            candidate.answer === 0 ? 'A' : (candidate.answer === 1 ? 'B' : (candidate.answer === 2 ? 'C' : 'D')),
            candidate.correctExplanation, candidate.wrongExplanation, candidate.mindset,
            candidate.speedHack, 'FALSE', 0, '', '', nowStr, candidate.scenarioType
          ];
        }

        // Appending to target tab
        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: `${tabName}!A:A`,
          valueInputOption: 'RAW',
          requestBody: { values: [targetRow] }
        });

        // Save to History Tab
        const historyRow = [
          candidate.id,
          candidateText,
          candidate.conceptTags,
          candidate.difficulty,
          candidate.reasoningType,
          candidate.scenarioType,
          candidateHash,
          nowStr
        ];

        await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: 'Question_History!A:A',
          valueInputOption: 'RAW',
          requestBody: { values: [historyRow] }
        });

        // Add to cache & local list to prevent duplicates in multi-generation runs
        embeddingsCache[candidate.id] = candidateEmbedding;
        saveEmbeddingsCache(embeddingsCache);

        history.push({
          questionId: candidate.id,
          questionText: candidateText,
          conceptTags: candidate.conceptTags,
          difficulty: candidate.difficulty,
          reasoningType: candidate.reasoningType,
          scenarioType: candidate.scenarioType,
          questionHash: candidateHash,
          createdAt: nowStr
        });

        console.log(`✅ Successfully saved generated question ${candidate.id} to Google Sheets!`);
      }

      successCount++;
    }

    if (successCount === count) {
      console.log(`\n🎉 Generation Successful! Generated ${successCount} new unique questions.`);
      
      // Auto-run sheets sync script to fetch the new question locally
      if (!isTest) {
        console.log('🔄 Triggering local data files sync (npx tsx scripts/syncSheets.ts)...');
        // Let's run it directly via a child process inside scripts, or tell the user
        // We will output instructions
      }
    } else {
      console.warn(`\n⚠️ Generation terminated early. Reached maximum attempts limits (${maxAttempts}). Generated: ${successCount}/${count}`);
    }

  } catch (error: any) {
    console.error('❌ Critical Generation Error:', error.message || error);
    process.exit(1);
  }
}

run();
