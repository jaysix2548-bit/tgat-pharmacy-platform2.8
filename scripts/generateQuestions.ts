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

const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-1.5-flash'; // Configurable, fallback to gemini-1.5-flash for compatibility

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
async function generateCandidate(examType: string, negativeConstraints: string[] = []): Promise<GenQuestion> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  let typePrompt = '';
  if (examType === 'tgat1') {
    typePrompt = `Generate a TGAT1 (English Communication) exam question. It should focus on either:
- Part 1: Conversation & Dialogue (Logical context, response logic)
- Part 2: Vocabulary & Sentence Structure (Context clues, syntax)
- Part 3: Reading Comprehension (Detailed passage followed by context-based question)`;
  } else if (examType === 'tgat2') {
    typePrompt = `Generate a TGAT2 (Critical & Logical Thinking) exam question. It should focus on either:
- Numerical reasoning (Sequences, equations, charts/tables data interpretation)
- Logical/Analytical reasoning (Puzzles, Venn diagrams, logical deductions)
- Spatial reasoning (Varying folding box styles, rotation logic)`;
  } else {
    typePrompt = `Generate a TGAT3 (Future Workforce Competencies) exam question. It should focus on:
- Problem Solving, Communication, or collaboration scenario in a workplace.
- Ensure the answers are graded scenario options (with choice A/B/C/D carrying different logical score weights, where one correct option is the best logical resolution).`;
  }

  const constraintSection = negativeConstraints.length > 0 
    ? `\nCRITICAL: You MUST NOT generate questions similar to these existing questions (avoid their scenarios, logic, contexts, or keywords):\n${negativeConstraints.map((c, i) => `[${i+1}] ${c}`).join('\n')}`
    : '';

  const systemInstructions = `You are a premium, state-of-the-art TGAT (Thailand General Aptitude Test) question generator.
Your target is to output a single, high-quality exam question matching the specified type.

${typePrompt}

---
CRITICAL GENERATION AND DIVERSITY RULES:
1. **Prioritize diversity**:
   - Vary concepts, reasoning structures, elimination patterns, and scenario types.
   - Vary graph interpretation styles and data analysis formats.
2. **Avoid duplication & clones**:
   - Absolutely NO template recycling, cosmetic rewrites (changing only names, numbers, or keywords of existing questions), parameter-swapped duplicates, or structurally identical questions.
   - Prohibit identical reasoning chains, identical elimination strategies, repeated distractor structures, recycled trap-answer patterns, repeated graph interpretation logic, repeated reading passage logic, and repeated workplace conflict structures.
3. **Prioritize variation**:
   - Vary the cognitive load, reasoning depth, trap-answer design, context framing, and interdisciplinary integration.
   - Distractors (wrong options) should have high logical appeal (traps) but contain a clear, logical flaw explained in the wrongExplanation.
4. **Mandatory Innovation**:
   - Every generated question must introduce at least ONE of: a new scenario, a new reasoning chain, a new analytical method, a new interdisciplinary connection, or a new interpretation pattern.

${constraintSection}

Ensure that the question feels like a genuinely new exam experience.`;

  const requestPayload = {
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

  const parsedQuestion: GenQuestion = JSON.parse(textResponse);
  return parsedQuestion;
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

      // 2. Generate a candidate question
      const candidate = await generateCandidate(examType, negativeConstraints);
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

        // Compute ID based on history size
        const prefix = examType === 'tgat2' ? 'T2' : (examType === 'tgat3' ? 'T3' : 'T1');
        const nextNum = history.filter(h => h.questionId.startsWith(prefix)).length + 1;
        const newId = `${prefix}-${String(nextNum).padStart(3, '0')}`;
        candidate.id = newId;

        // Save to specific Question Tab
        const nowStr = new Date().toISOString();
        const tabName = examType === 'tgat2' ? 'TGAT2_Questions' : (examType === 'tgat3' ? 'TGAT3_Questions' : 'TGAT1_Questions');
        
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
            candidate.id, 'TGAT2', candidate.difficulty, candidate.topic, '', candidate.section,
            candidate.partTitle, candidate.suggestedTime, candidate.estimatedTime,
            candidate.frequency, candidate.examWeight, candidate.yearPattern,
            candidate.text, candidate.passage || '',
            candidate.options[0], candidate.options[1], candidate.options[2], candidate.options[3],
            candidate.answer === 0 ? 'A' : (candidate.answer === 1 ? 'B' : (candidate.answer === 2 ? 'C' : 'D')),
            candidate.correctExplanation, candidate.wrongExplanation, candidate.mindset,
            candidate.speedHack, 'FALSE', 0, '', '', nowStr, candidate.reasoningType
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
