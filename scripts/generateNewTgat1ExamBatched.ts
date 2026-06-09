import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';

// Load environment variables from .env.local
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in environment variables. Check .env.local");
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in environment variables. Check .env.local");
  process.exit(1);
}

const EMBEDDING_MODEL = 'gemini-embedding-2';
const GENERATION_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite'];
const CACHE_PATH = path.join(__dirname, 'embeddings_cache_tgat1.json');

// Interface definition for Question
interface GenQuestion {
  id?: string;
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
  answer: number; // 0-3 index
  correctExplanation: string;
  wrongExplanation: string;
  mindset: string;
  speedHack: string;
  conceptTags: string;
}

// -------------------------------------------------------------------------
// Helper functions for Embedding & Similarity
// -------------------------------------------------------------------------

let embeddingsCache: Record<string, number[]> = {};

function loadEmbeddingsCache(): Record<string, number[]> {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      embeddingsCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      return embeddingsCache;
    } catch {
      return {};
    }
  }
  return {};
}

function saveEmbeddingsCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(embeddingsCache, null, 2), 'utf-8');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: any, retries = 5, delay = 5000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        console.warn(`⚠️ Rate limit hit (429). Sleeping for ${delay / 1000}s before retry...`);
        await sleep(delay);
        delay = Math.min(delay * 2, 60000);
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`⚠️ Fetch network error. Retrying in ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
  throw new Error("Failed after maximum retries");
}

async function getEmbedding(text: string): Promise<number[]> {
  const hash = getHash(text);
  if (embeddingsCache[hash]) {
    return embeddingsCache[hash];
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetchWithRetry(url, {
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

  embeddingsCache[hash] = result.embedding.values;
  saveEmbeddingsCache();
  return result.embedding.values;
}

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

function getHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

function getFullTextForEmbedding(q: GenQuestion | any): string {
  const optionsText = Array.isArray(q.options) ? q.options.join(' | ') : '';
  const passageText = q.passage ? `${q.passage}\n` : '';
  return `${passageText}${q.text}\nOptions: ${optionsText}`;
}

// Load existing questions for negative constraints
function getOriginalQuestions(): GenQuestion[] {
  const filePath = path.join(projectDir, 'src/data/tgat1.ts');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e: any) {
    console.warn('⚠️ Could not parse original tgat1.ts:', e.message);
  }
  return [];
}

// -------------------------------------------------------------------------
// API generation with Model Fallback
// -------------------------------------------------------------------------

async function generateWithFallback(prompt: string, schema: any): Promise<any> {
  let lastError: any = null;

  for (const model of GENERATION_MODELS) {
    console.log(`🤖 Attempting generation with model: ${model}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    const requestPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    };

    try {
      await sleep(2000); // Throttling delay
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      const responseText = await response.text();

      if (!response.ok) {
        // Check if quota error
        if (response.status === 429 || responseText.includes("RESOURCE_EXHAUSTED") || responseText.includes("quota")) {
          console.warn(`⚠️ Model ${model} is exhausted or rate limited. Status ${response.status}. Trying next model...`);
          lastError = new Error(`Quota limit reached for ${model}: ${responseText}`);
          continue;
        }
        throw new Error(`API error for ${model}: ${response.status} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error(`Empty response content from Gemini candidate generation API on model ${model}.`);
      }
      return JSON.parse(textResponse);

    } catch (err: any) {
      console.warn(`⚠️ Failure with model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message || lastError}`);
}

// -------------------------------------------------------------------------
// API generation helpers
// -------------------------------------------------------------------------

async function generateQuestionBatch(
  section: string,
  partTitle: string,
  count: number,
  difficulties: ("Easy" | "Medium" | "Hard")[],
  negativeScenarios: string[],
  additionalInstructions: string = ""
): Promise<GenQuestion[]> {
  const schema = {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            difficulty: { type: 'STRING', enum: ['Easy', 'Medium', 'Hard'] },
            topic: { type: 'STRING', description: 'Theme or context topic (e.g. Workplace Feedback, Pharmacy Consultation)' },
            text: { type: 'STRING', description: 'Question prompt or dialogue text. Use HTML <br> for lines.' },
            options: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              minItems: 4,
              maxItems: 4
            },
            answer: { type: 'INTEGER', description: '0-3 correct option index' },
            correctExplanation: { type: 'STRING', description: 'Detailed explanation in Thai' },
            wrongExplanation: { type: 'STRING', description: 'Detailed explanation in Thai' },
            mindset: { type: 'STRING', description: 'Mindset in Thai' },
            speedHack: { type: 'STRING', description: 'Speed hack in Thai' },
            conceptTags: { type: 'STRING', description: 'Comma-separated tags' }
          },
          required: [
            'difficulty', 'topic', 'text', 'options', 'answer',
            'correctExplanation', 'wrongExplanation', 'mindset', 'speedHack', 'conceptTags'
          ]
        }
      }
    },
    required: ['questions']
  };

  const prompt = `You are a premium, state-of-the-art TGAT1 (English Communication) exam question generator.
Your target is to output a batch of exactly ${count} high-quality, completely unique exam questions.

Section: ${section}
Part Title: ${partTitle}
Number of questions: ${count}
Target Difficulties (in order): ${difficulties.join(', ')}

${additionalInstructions}

NEGATIVE CONSTRAINTS (Avoid these scenarios, contexts, themes, or stories entirely):
${negativeScenarios.slice(-20).map((s, idx) => `[${idx + 1}] ${s}`).join('\n')}

COGNITIVE DESIGN PHILOSOPHY FOR TGAT1:
1. Focus on fast English processing, communication interpretation, implication detection, and reading under pressure.
2. EASY: Short, clear intent, low ambiguity, easy elimination (solve time 20-40s).
3. MEDIUM: Implication analysis, moderate ambiguity, force careful reading, assumption traps (solve time 45-70s).
4. HARD: Precise interpretation, subtle tone/intention, strategic distractors (close choices, partial truths), complex context (solve time 70-100s).
5. All choices (options) must be exactly 4 choices.
6. The explanations (correctExplanation, wrongExplanation), mindset, and speedHack MUST be written in Thai language.
7. The question and options themselves MUST be written in English.

Ensure that all generated questions are realistic, authentic, and feel like they came from an official TCAS exam. Ensure they are distinct from one another.`;

  const responseObj = await generateWithFallback(prompt, schema);
  const questions: GenQuestion[] = responseObj.questions || [];

  // Enforce properties
  questions.forEach((q, idx) => {
    q.section = section;
    q.partTitle = partTitle;
    q.passage = null;
    q.difficulty = difficulties[idx] || q.difficulty;
  });

  return questions;
}

interface PassageGroupGen {
  passage: string;
  topic: string;
  questions: {
    difficulty: "Easy" | "Medium" | "Hard";
    text: string;
    options: string[];
    answer: number;
    correctExplanation: string;
    wrongExplanation: string;
    mindset: string;
    speedHack: string;
    conceptTags: string;
  }[];
}

async function generatePassageGroup(
  type: 'Text Completion' | 'Reading Comprehension',
  difficulties: ("Easy" | "Medium" | "Hard")[],
  partTitle: string,
  negativeScenarios: string[],
  additionalInstructions: string = ""
): Promise<PassageGroupGen> {
  const typePrompt = type === 'Text Completion'
    ? `Generate a Text Completion passage (around 100-200 words) with ${difficulties.length} blank markers represented as [33], [34], etc., according to the target slots.
The questions array must have exactly ${difficulties.length} items. Question 1 corresponds to the first blank, Question 2 to the second, etc.
For each blank, the question prompt should just be 'Choose the best answer for blank [Number]'.`
    : `Generate a Reading Comprehension passage (around 150-300 words). The style should be: ${additionalInstructions} (e.g. workplace memo, announcement, letter, email, or magazine article).
Generate exactly ${difficulties.length} reading comprehension questions about this passage.
The questions should test main idea, detail, inference, tone, or developer intention.`;

  const schema = {
    type: 'OBJECT',
    properties: {
      passage: { type: 'STRING', description: 'The HTML-formatted passage. Use <p>, <br> tags. If text completion, insert blank markers like [33], [34], etc.' },
      topic: { type: 'STRING', description: 'General theme/topic tag (e.g. Workplace Email, Environmental Policy Notice)' },
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            difficulty: { type: 'STRING', enum: ['Easy', 'Medium', 'Hard'] },
            text: { type: 'STRING', description: 'Question text. For text completion, use: Choose the best answer for blank [X].' },
            options: {
              type: 'ARRAY',
              items: { type: 'STRING' },
              minItems: 4,
              maxItems: 4
            },
            answer: { type: 'INTEGER', description: '0-3 index of correct option' },
            correctExplanation: { type: 'STRING', description: 'Detailed explanation of correct option in Thai' },
            wrongExplanation: { type: 'STRING', description: 'Detailed analysis of why other options are incorrect/traps in Thai' },
            mindset: { type: 'STRING', description: 'Mindset in Thai' },
            speedHack: { type: 'STRING', description: 'Speed hack in Thai' },
            conceptTags: { type: 'STRING', description: 'Comma-separated concept tags' }
          },
          required: [
            'difficulty', 'text', 'options', 'answer',
            'correctExplanation', 'wrongExplanation', 'mindset', 'speedHack', 'conceptTags'
          ]
        }
      }
    },
    required: ['passage', 'topic', 'questions']
  };

  const prompt = `You are a premium, state-of-the-art TGAT1 (English Communication) exam question generator.
Your target is to output a single reading/completion passage and its associated questions as a cohesive group.

Type: ${type}
Part Title: ${partTitle}
Number of Questions: ${difficulties.length}
Target Difficulties: ${difficulties.join(', ')}

${typePrompt}

NEGATIVE CONSTRAINTS (Avoid these scenarios, contexts, themes, or stories entirely):
${negativeScenarios.slice(-20).map((s, idx) => `[${idx + 1}] ${s}`).join('\n')}

COGNITIVE DESIGN PHILOSOPHY FOR TGAT1:
1. Focus on fast English processing, communication interpretation, implication detection, and reading under pressure.
2. EASY: Low cognitive load, short, clear intent, low ambiguity (solve time 20-40s).
3. MEDIUM: Implication analysis, moderate ambiguity, force careful reading, assumption traps (solve time 45-70s).
4. HARD: Precise interpretation, subtle tone/intention, strategic distractors (close choices, partial truths), complex context (solve time 70-100s).
5. All choices (options) must be exactly 4 choices.
6. The explanations (correctExplanation, wrongExplanation), mindset, and speedHack MUST be written in Thai language.
7. The passage, questions, and options themselves MUST be written in English.

Ensure that the passage is realistic, authentic, and feels like it came from an official TCAS exam.`;

  const parsedGroup: PassageGroupGen = await generateWithFallback(prompt, schema);
  
  // Enforce difficulties match the requested targets
  parsedGroup.questions.forEach((q, idx) => {
    q.difficulty = difficulties[idx] || q.difficulty;
  });

  return parsedGroup;
}

async function secondaryLlmCheck(newQuestion: GenQuestion, similarQuestions: any[]): Promise<{ approved: boolean; reason: string }> {
  if (similarQuestions.length === 0) return { approved: true, reason: 'No similar questions found to compare.' };

  const schema = {
    type: 'OBJECT',
    properties: {
      approved: { type: 'BOOLEAN' },
      reason: { type: 'STRING' }
    },
    required: ['approved', 'reason']
  };

  const similarItemsFormatted = similarQuestions.map((q, i) => {
    return `=== HISTORICAL MATCH #${i+1} ===
ID: ${q.questionId}
Text: ${q.questionText}
`;
  }).join('\n');

  const newFormatted = `=== NEW CANDIDATE QUESTION ===
Text: ${newQuestion.passage ? `${newQuestion.passage}\n` : ''}${newQuestion.text}
Options: ${newQuestion.options.join(' | ')}
Explanations: ${newQuestion.correctExplanation} | ${newQuestion.wrongExplanation}
`;

  const prompt = `You are a strict TGAT exam quality auditor. Your job is to compare a new candidate question against similar historical matches and reject it if it is a duplicate, a slightly modified cosmetic rewrite, or uses the exact same scenario/reasoning chain.

${newFormatted}

Compare it against these close matches from the database:
${similarItemsFormatted}

REJECTION CRITIERIA:
Reject the new candidate if it matches any of the following with a historical match:
1. Same scenario with cosmetic changes (e.g. changing names, numbers, objects but keeping the story/logic the same).
2. Identical reasoning chain or logic structures.
3. Cosmetic rewrites of the question text.
4. Identical elimination strategies or identical trap-answer patterns.

Response Schema: JSON object with:
- "approved": boolean
- "reason": string`;

  return await generateWithFallback(prompt, schema);
}

// -------------------------------------------------------------------------
// Main Generation Loop
// -------------------------------------------------------------------------

async function run() {
  console.log('🚀 TGAT1 FULL EXAM BATCHED GENERATOR & REPLACER');
  console.log('--------------------------------------------------');

  try {
    const sheets = await getGoogleSheetsClient();
    loadEmbeddingsCache();
    
    // Fetch original questions for constraints
    const originalQuestions = getOriginalQuestions();
    console.log(`📊 Loaded ${originalQuestions.length} original questions from local src/data/tgat1.ts`);

    const negativeScenarios: string[] = originalQuestions.map(q => {
      return q.text.replace(/<[^>]*>/g, '').slice(0, 100);
    });

    const historyPool: any[] = originalQuestions.map(q => ({
      questionId: q.id,
      questionText: getFullTextForEmbedding(q),
      conceptTags: q.topic,
      difficulty: q.difficulty,
    }));

    // Pre-cache embeddings for original questions
    console.log('⏳ Checking embeddings cache for original questions...');
    let cacheUpdated = false;
    for (const h of historyPool) {
      const hHash = getHash(h.questionText);
      if (!embeddingsCache[hHash]) {
        console.log(`Vectorizing and caching original question ${h.questionId}...`);
        try {
          embeddingsCache[hHash] = await getEmbedding(h.questionText.slice(0, 1500));
          cacheUpdated = true;
        } catch (err: any) {
          console.warn(`⚠️ Failed to generate embedding for ${h.questionId}:`, err.message);
        }
      }
    }
    if (cacheUpdated) {
      saveEmbeddingsCache();
    }
    console.log('✅ Original questions embeddings loaded.');

    const finalQuestions: GenQuestion[] = [];

    async function processAndValidate(candidate: GenQuestion, otherCandidatesInBatch: GenQuestion[]): Promise<boolean> {
      const candidateText = getFullTextForEmbedding(candidate);
      const candidateEmbedding = await getEmbedding(candidateText);

      let highestSimilarity = 0;
      let mostSimilarQuestion: any = null;
      const similarCandidatesList: any[] = [];

      for (const h of historyPool) {
        const hHash = getHash(h.questionText);
        const hEmbedding = embeddingsCache[hHash];
        if (!hEmbedding) continue;

        const similarity = cosineSimilarity(candidateEmbedding, hEmbedding);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarQuestion = h;
        }

        if (similarity > 0.50) {
          similarCandidatesList.push({ item: h, score: similarity });
        }
      }

      // Check against other candidates in this batch
      for (const other of otherCandidatesInBatch) {
        if (other === candidate) continue;
        const otherText = getFullTextForEmbedding(other);
        const otherEmbedding = await getEmbedding(otherText);
        const similarity = cosineSimilarity(candidateEmbedding, otherEmbedding);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          mostSimilarQuestion = { questionId: 'CurrentBatchItem', questionText: otherText };
        }
        if (similarity > 0.50) {
          similarCandidatesList.push({ item: { questionId: 'CurrentBatchItem', questionText: otherText }, score: similarity });
        }
      }

      similarCandidatesList.sort((a, b) => b.score - a.score);
      const topMatches = similarCandidatesList.slice(0, 3).map(x => x.item);

      const isShortText = candidate.section === 'Conversation' || candidate.section === 'Grammar';
      const threshold = isShortText ? 0.85 : 0.80;
      if (highestSimilarity > threshold) {
        console.warn(`   ⚠️ Semantic similarity (${highestSimilarity.toFixed(4)}) exceeds the ${threshold} threshold. Rejecting.`);
        return false;
      }

      const auditorResult = await secondaryLlmCheck(candidate, topMatches);
      if (!auditorResult.approved) {
        console.warn(`   ⚠️ Rejected by LLM Auditor. Reason: ${auditorResult.reason}`);
        return false;
      }

      return true;
    }

    // -------------------------------------------------------------------------
    // BATCH RUNNER
    // -------------------------------------------------------------------------

    // A. Section 1: Question-Response (Q1-Q10)
    console.log('\n--- Section 1: Question-Response (10 questions, 2 batches) ---');
    const qrBatches = [
      { start: 1, diffs: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Easy', 'Medium', 'Easy', 'Medium'], ests: [20, 25, 50, 30, 55], sugs: ['Suggested Time: 20s', 'Suggested Time: 25s', 'Suggested Time: 50s', 'Suggested Time: 30s', 'Suggested Time: 55s'] },
      { start: 6, diffs: <("Easy" | "Medium" | "Hard")[]>['Hard', 'Medium', 'Easy', 'Medium', 'Medium'], ests: [80, 60, 30, 50, 55], sugs: ['Suggested Time: 80s', 'Suggested Time: 60s', 'Suggested Time: 30s', 'Suggested Time: 50s', 'Suggested Time: 55s'] }
    ];

    for (const batch of qrBatches) {
      let approved = false;
      let attempts = 0;
      let batchQuestions: GenQuestion[] = [];

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating QR batch (Q${batch.start}-Q${batch.start + 4}) - Attempt #${attempts}...`);
        try {
          batchQuestions = await generateQuestionBatch(
            'Conversation',
            'PART 1: CONVERSATION (Question-Response)',
            5,
            batch.diffs,
            negativeScenarios,
            'This batch must consist of Question-Response items. For each item, one speaker says something, and the options represent possible responses.'
          );

          let allValid = true;
          const validatedList: GenQuestion[] = [];
          for (const q of batchQuestions) {
            const valid = await processAndValidate(q, validatedList);
            if (!valid) {
              allValid = false;
              break;
            }
            validatedList.push(q);
          }
          approved = allValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique batch for QR start ${batch.start}`);
      }

      batchQuestions.forEach((q, idx) => {
        const qIdx = batch.start + idx;
        q.id = `T1-${String(qIdx).padStart(3, '0')}`;
        q.estimatedTime = batch.ests[idx];
        q.suggestedTime = batch.sugs[idx];
        finalQuestions.push(q);
        negativeScenarios.push(q.text.slice(0, 100));
        
        historyPool.push({
          questionId: q.id,
          questionText: getFullTextForEmbedding(q),
          conceptTags: q.topic,
          difficulty: q.difficulty,
        });

        console.log(`✅ Q${qIdx} added: "${q.topic}" (${q.difficulty})`);
      });
    }

    // B. Section 2: Short Conversations (Q11-Q22)
    console.log('\n--- Section 2: Short Conversations (12 questions, 2 batches) ---');
    const scBatches = [
      { start: 11, diffs: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Easy', 'Medium', 'Hard', 'Medium'], ests: [30, 60, 35, 55, 90, 60], sugs: ['Suggested Time: 30s', 'Suggested Time: 60s', 'Suggested Time: 35s', 'Suggested Time: 55s', 'Suggested Time: 90s', 'Suggested Time: 60s'] },
      { start: 17, diffs: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Hard', 'Medium', 'Easy', 'Medium'], ests: [30, 65, 85, 55, 30, 60], sugs: ['Suggested Time: 30s', 'Suggested Time: 65s', 'Suggested Time: 85s', 'Suggested Time: 55s', 'Suggested Time: 30s', 'Suggested Time: 60s'] }
    ];

    for (const batch of scBatches) {
      let approved = false;
      let attempts = 0;
      let batchQuestions: GenQuestion[] = [];

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating SC batch (Q${batch.start}-Q${batch.start + 5}) - Attempt #${attempts}...`);
        try {
          batchQuestions = await generateQuestionBatch(
            'Conversation',
            'PART 1: CONVERSATION (Short Conversations)',
            6,
            batch.diffs,
            negativeScenarios,
            'This batch must consist of Short Conversation items (2-3 exchanges between two speakers).'
          );

          let allValid = true;
          const validatedList: GenQuestion[] = [];
          for (const q of batchQuestions) {
            const valid = await processAndValidate(q, validatedList);
            if (!valid) {
              allValid = false;
              break;
            }
            validatedList.push(q);
          }
          approved = allValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique batch for SC start ${batch.start}`);
      }

      batchQuestions.forEach((q, idx) => {
        const qIdx = batch.start + idx;
        q.id = `T1-${String(qIdx).padStart(3, '0')}`;
        q.estimatedTime = batch.ests[idx];
        q.suggestedTime = batch.sugs[idx];
        finalQuestions.push(q);
        negativeScenarios.push(q.text.slice(0, 100));
        
        historyPool.push({
          questionId: q.id,
          questionText: getFullTextForEmbedding(q),
          conceptTags: q.topic,
          difficulty: q.difficulty,
        });

        console.log(`✅ Q${qIdx} added: "${q.topic}" (${q.difficulty})`);
      });
    }

    // C. Section 3: Long Conversations (Q23-Q32)
    console.log('\n--- Section 3: Long Conversations (10 questions, 2 batches) ---');
    const lcBatches = [
      { start: 23, diffs: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Hard', 'Medium', 'Easy'], ests: [40, 70, 95, 65, 40], sugs: ['Suggested Time: 40s', 'Suggested Time: 70s', 'Suggested Time: 95s', 'Suggested Time: 65s', 'Suggested Time: 40s'] },
      { start: 28, diffs: <("Easy" | "Medium" | "Hard")[]>['Medium', 'Hard', 'Medium', 'Medium', 'Hard'], ests: [70, 100, 60, 65, 90], sugs: ['Suggested Time: 70s', 'Suggested Time: 100s', 'Suggested Time: 60s', 'Suggested Time: 65s', 'Suggested Time: 90s'] }
    ];

    for (const batch of lcBatches) {
      let approved = false;
      let attempts = 0;
      let batchQuestions: GenQuestion[] = [];

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating LC batch (Q${batch.start}-Q${batch.start + 4}) - Attempt #${attempts}...`);
        try {
          batchQuestions = await generateQuestionBatch(
            'Conversation',
            'PART 1: CONVERSATION (Long Conversations)',
            5,
            batch.diffs,
            negativeScenarios,
            'This batch must consist of Long Conversation items (4-6 exchanges between two speakers).'
          );

          let allValid = true;
          const validatedList: GenQuestion[] = [];
          for (const q of batchQuestions) {
            const valid = await processAndValidate(q, validatedList);
            if (!valid) {
              allValid = false;
              break;
            }
            validatedList.push(q);
          }
          approved = allValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique batch for LC start ${batch.start}`);
      }

      batchQuestions.forEach((q, idx) => {
        const qIdx = batch.start + idx;
        q.id = `T1-${String(qIdx).padStart(3, '0')}`;
        q.estimatedTime = batch.ests[idx];
        q.suggestedTime = batch.sugs[idx];
        finalQuestions.push(q);
        negativeScenarios.push(q.text.slice(0, 100));

        historyPool.push({
          questionId: q.id,
          questionText: getFullTextForEmbedding(q),
          conceptTags: q.topic,
          difficulty: q.difficulty,
        });

        console.log(`✅ Q${qIdx} added: "${q.topic}" (${q.difficulty})`);
      });
    }

    // D. Section 4: Text Completion (Q33-Q40)
    console.log('\n--- Section 4: Text Completion (8 questions, 2 passages) ---');
    const tcPassages = [
      {
        startIdx: 33,
        difficulties: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Medium', 'Hard'],
        ests: [35, 60, 65, 90],
        sugs: ['Suggested Time: 35s', 'Suggested Time: 60s', 'Suggested Time: 65s', 'Suggested Time: 90s']
      },
      {
        startIdx: 37,
        difficulties: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Medium', 'Medium'],
        ests: [30, 55, 60, 65],
        sugs: ['Suggested Time: 30s', 'Suggested Time: 55s', 'Suggested Time: 60s', 'Suggested Time: 65s']
      }
    ];

    for (let pIdx = 0; pIdx < tcPassages.length; pIdx++) {
      const tcPassage = tcPassages[pIdx];
      let approved = false;
      let attempts = 0;
      let groupResult!: PassageGroupGen;

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating Text Completion Passage #${pIdx + 1} (Start: Q${tcPassage.startIdx}) - Attempt #${attempts}...`);
        try {
          groupResult = await generatePassageGroup(
            'Text Completion',
            tcPassage.difficulties,
            'PART 2: TEXT COMPLETION',
            negativeScenarios,
            `Generate an interesting story or workplace notice. The blank tags should be: ${tcPassage.difficulties.map((_, i) => `[${tcPassage.startIdx + i}]`).join(', ')}`
          );

          let allSubQuestionsValid = true;
          const validatedList: GenQuestion[] = [];
          for (let i = 0; i < groupResult.questions.length; i++) {
            const q = groupResult.questions[i];
            const tempQ: GenQuestion = {
              difficulty: q.difficulty,
              topic: groupResult.topic,
              section: 'Text Completion',
              partTitle: 'PART 2: TEXT COMPLETION',
              suggestedTime: tcPassage.sugs[i],
              estimatedTime: tcPassage.ests[i],
              frequency: 'Medium',
              examWeight: 5,
              yearPattern: '2567-2568',
              text: q.text,
              passage: groupResult.passage,
              options: q.options,
              answer: q.answer,
              correctExplanation: q.correctExplanation,
              wrongExplanation: q.wrongExplanation,
              mindset: q.mindset,
              speedHack: q.speedHack,
              conceptTags: q.conceptTags
            };
            const valid = await processAndValidate(tempQ, validatedList);
            if (!valid) {
              allSubQuestionsValid = false;
              break;
            }
            validatedList.push(tempQ);
          }
          approved = allSubQuestionsValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique passage group for Text Completion Passage #${pIdx + 1}`);
      }

      groupResult.questions.forEach((q, idx) => {
        const finalQIndex = tcPassage.startIdx + idx;
        const candidate: GenQuestion = {
          id: `T1-${String(finalQIndex).padStart(3, '0')}`,
          difficulty: q.difficulty,
          topic: groupResult.topic,
          section: 'Text Completion',
          partTitle: 'PART 2: TEXT COMPLETION',
          suggestedTime: tcPassage.sugs[idx],
          estimatedTime: tcPassage.ests[idx],
          frequency: 'Medium',
          examWeight: 5,
          yearPattern: '2567-2568',
          text: q.text,
          passage: groupResult.passage,
          options: q.options,
          answer: q.answer,
          correctExplanation: q.correctExplanation,
          wrongExplanation: q.wrongExplanation,
          mindset: q.mindset,
          speedHack: q.speedHack,
          conceptTags: q.conceptTags
        };
        finalQuestions.push(candidate);
        negativeScenarios.push(candidate.text.slice(0, 100));

        historyPool.push({
          questionId: candidate.id,
          questionText: getFullTextForEmbedding(candidate),
          conceptTags: candidate.topic,
          difficulty: candidate.difficulty,
        });

        console.log(`✅ Q${finalQIndex} added: "${candidate.topic}" (${candidate.difficulty})`);
      });
      negativeScenarios.push(groupResult.passage.slice(0, 150));
    }

    // E. Section 5: Reading Comprehension (Q41-Q54)
    console.log('\n--- Section 5: Reading Comprehension (14 questions, 3 passages) ---');
    const rcPassages = [
      {
        startIdx: 41,
        difficulties: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Easy', 'Hard'],
        ests: [40, 65, 35, 95],
        sugs: ['Suggested Time: 40s', 'Suggested Time: 65s', 'Suggested Time: 35s', 'Suggested Time: 95s'],
        style: 'Workplace Memo or Announcement (Direct details, explicit logic)'
      },
      {
        startIdx: 45,
        difficulties: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Medium', 'Hard', 'Hard'],
        ests: [40, 70, 75, 100, 95],
        sugs: ['Suggested Time: 40s', 'Suggested Time: 70s', 'Suggested Time: 75s', 'Suggested Time: 100s', 'Suggested Time: 95s'],
        style: 'Product Launch Update or Clinical Trial Summary (Scientific/Medical data interpretation, moderate ambiguity)'
      },
      {
        startIdx: 50,
        difficulties: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Medium', 'Medium', 'Hard'],
        ests: [45, 65, 70, 75, 100],
        sugs: ['Suggested Time: 45s', 'Suggested Time: 65s', 'Suggested Time: 70s', 'Suggested Time: 75s', 'Suggested Time: 100s'],
        style: 'Public Relations Crisis Statement or Business Correspondence (High context nuance, tone analysis, subtle intentions)'
      }
    ];

    for (let pIdx = 0; pIdx < rcPassages.length; pIdx++) {
      const rcPassage = rcPassages[pIdx];
      let approved = false;
      let attempts = 0;
      let groupResult!: PassageGroupGen;

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating Reading Comprehension Passage #${pIdx + 1} (Start: Q${rcPassage.startIdx}) - Attempt #${attempts}...`);
        try {
          groupResult = await generatePassageGroup(
            'Reading Comprehension',
            rcPassage.difficulties,
            'PART 3: READING COMPREHENSION',
            negativeScenarios,
            rcPassage.style
          );

          let allSubQuestionsValid = true;
          const validatedList: GenQuestion[] = [];
          for (let i = 0; i < groupResult.questions.length; i++) {
            const q = groupResult.questions[i];
            const tempQ: GenQuestion = {
              difficulty: q.difficulty,
              topic: groupResult.topic,
              section: 'Reading',
              partTitle: 'PART 3: READING COMPREHENSION',
              suggestedTime: rcPassage.sugs[i],
              estimatedTime: rcPassage.ests[i],
              frequency: 'Medium',
              examWeight: 5,
              yearPattern: '2567-2568',
              text: q.text,
              passage: groupResult.passage,
              options: q.options,
              answer: q.answer,
              correctExplanation: q.correctExplanation,
              wrongExplanation: q.wrongExplanation,
              mindset: q.mindset,
              speedHack: q.speedHack,
              conceptTags: q.conceptTags
            };
            const valid = await processAndValidate(tempQ, validatedList);
            if (!valid) {
              allSubQuestionsValid = false;
              break;
            }
            validatedList.push(tempQ);
          }
          approved = allSubQuestionsValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique passage group for Reading Comprehension Passage #${pIdx + 1}`);
      }

      groupResult.questions.forEach((q, idx) => {
        const finalQIndex = rcPassage.startIdx + idx;
        const candidate: GenQuestion = {
          id: `T1-${String(finalQIndex).padStart(3, '0')}`,
          difficulty: q.difficulty,
          topic: groupResult.topic,
          section: 'Reading',
          partTitle: 'PART 3: READING COMPREHENSION',
          suggestedTime: rcPassage.sugs[idx],
          estimatedTime: rcPassage.ests[idx],
          frequency: 'Medium',
          examWeight: 5,
          yearPattern: '2567-2568',
          text: q.text,
          passage: groupResult.passage,
          options: q.options,
          answer: q.answer,
          correctExplanation: q.correctExplanation,
          wrongExplanation: q.wrongExplanation,
          mindset: q.mindset,
          speedHack: q.speedHack,
          conceptTags: q.conceptTags
        };
        finalQuestions.push(candidate);
        negativeScenarios.push(candidate.text.slice(0, 100));

        historyPool.push({
          questionId: candidate.id,
          questionText: getFullTextForEmbedding(candidate),
          conceptTags: candidate.topic,
          difficulty: candidate.difficulty,
        });

        console.log(`✅ Q${finalQIndex} added: "${candidate.topic}" (${candidate.difficulty})`);
      });
      negativeScenarios.push(groupResult.passage.slice(0, 150));
    }

    // F. Section 6: Grammar (Q55-Q60)
    console.log('\n--- Section 6: Grammar (6 questions, 1 batch) ---');
    const gramBatch = {
      start: 55,
      diffs: <("Easy" | "Medium" | "Hard")[]>['Easy', 'Medium', 'Easy', 'Medium', 'Hard', 'Medium'],
      ests: [35, 60, 30, 65, 90, 60],
      sugs: ['Suggested Time: 35s', 'Suggested Time: 60s', 'Suggested Time: 30s', 'Suggested Time: 65s', 'Suggested Time: 90s', 'Suggested Time: 60s']
    };

    let approved = false;
    let attempts = 0;
    let batchQuestions: GenQuestion[] = [];

    while (!approved && attempts < 5) {
      attempts++;
      console.log(`⏳ Generating Grammar batch (Q55-Q60) - Attempt #${attempts}...`);
      try {
        batchQuestions = await generateQuestionBatch(
          'Grammar',
          'PART 4: GRAMMAR IN CONTEXT',
          6,
          gramBatch.diffs,
          negativeScenarios,
          'This batch must consist of Grammar in Context items testing syntax, tense, preposition, or clause structure in communication context.'
        );

        let allValid = true;
        const validatedList: GenQuestion[] = [];
        for (const q of batchQuestions) {
          const valid = await processAndValidate(q, validatedList);
          if (!valid) {
            allValid = false;
            break;
          }
          validatedList.push(q);
        }
        approved = allValid;
      } catch (e: any) {
        console.error(`   ⚠️ Error: ${e.message}`);
      }
    }

    if (!approved) {
      throw new Error(`Failed to generate a valid unique batch for Grammar start 55`);
    }

    batchQuestions.forEach((q, idx) => {
      const qIdx = gramBatch.start + idx;
      q.id = `T1-${String(qIdx).padStart(3, '0')}`;
      q.estimatedTime = gramBatch.ests[idx];
      q.suggestedTime = gramBatch.sugs[idx];
      finalQuestions.push(q);
      negativeScenarios.push(q.text.slice(0, 100));

      historyPool.push({
        questionId: q.id,
        questionText: getFullTextForEmbedding(q),
        conceptTags: q.topic,
        difficulty: q.difficulty,
      });

      console.log(`✅ Q${qIdx} added: "${q.topic}" (${q.difficulty})`);
    });

    // -------------------------------------------------------------------------
    // WRITE RESULTS
    // -------------------------------------------------------------------------
    console.log('\n--------------------------------------------------');
    console.log(`🎉 ALL 60 QUESTIONS GENERATED SUCCESSFULLY!`);
    console.log(`Easy: ${finalQuestions.filter(q => q.difficulty === 'Easy').length} (Expected: 18)`);
    console.log(`Medium: ${finalQuestions.filter(q => q.difficulty === 'Medium').length} (Expected: 30)`);
    console.log(`Hard: ${finalQuestions.filter(q => q.difficulty === 'Hard').length} (Expected: 12)`);
    console.log('--------------------------------------------------');

    // 1. Overwrite Google Sheets tab: TGAT1_Questions
    console.log('🧹 Clearing TGAT1_Questions sheet values...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: 'TGAT1_Questions!A2:AZ1000'
    });

    console.log('💾 Writing to TGAT1_Questions tab...');
    const nowStr = new Date().toISOString();
    const targetRows = finalQuestions.map(candidate => [
      candidate.id,
      'TGAT1',
      candidate.difficulty,
      candidate.topic,
      '', // subtopic
      candidate.section,
      candidate.partTitle,
      candidate.suggestedTime,
      candidate.estimatedTime,
      'High', // frequency
      5, // examWeight
      '2568-2569', // yearPattern
      candidate.text,
      candidate.passage || '',
      candidate.options[0],
      candidate.options[1],
      candidate.options[2],
      candidate.options[3],
      candidate.answer === 0 ? 'A' : (candidate.answer === 1 ? 'B' : (candidate.answer === 2 ? 'C' : 'D')),
      candidate.correctExplanation,
      candidate.wrongExplanation,
      candidate.mindset,
      candidate.speedHack,
      'FALSE', // isUsed
      0, // usageCount
      '', // lastUsedAt
      '', // tags
      nowStr
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'TGAT1_Questions!A2',
      valueInputOption: 'RAW',
      requestBody: {
        values: targetRows
      }
    });
    console.log('✅ Google Sheets TGAT1_Questions tab updated!');

    // 2. Append new questions to Question_History sheet
    console.log('💾 Appending to Question_History tab...');
    const historyRows = finalQuestions.map(candidate => {
      const fullText = getFullTextForEmbedding(candidate);
      return [
        candidate.id,
        fullText,
        candidate.conceptTags || candidate.topic,
        candidate.difficulty,
        '', // reasoningType
        candidate.section,
        getHash(fullText),
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
    console.log('✅ Google Sheets Question_History tab appended!');

    // 3. Save to local src/data/tgat1.ts file
    console.log('💾 Overwriting local src/data/tgat1.ts...');
    const localContent = `import type { TGAT1Question } from "@/types/exam";\n\nexport const TGAT1_QUESTIONS: TGAT1Question[] = ${JSON.stringify(
      finalQuestions.map(q => ({
        ...q,
        isUsed: false,
        usageCount: 0,
        lastUsedAt: null,
        examCategory: 'tgat1'
      })),
      null,
      2
    )};\n`;

    fs.writeFileSync(path.join(projectDir, 'src/data/tgat1.ts'), localContent, 'utf-8');
    console.log('✨ Updated [tgat1.ts] locally with 60 questions!');

    // Save final updated cache
    saveEmbeddingsCache();
    console.log('🎉 Generation completed and fully synchronized.');

  } catch (error: any) {
    console.error('❌ Critical Error during generation flow:', error.message || error);
    process.exit(1);
  }
}

run();
