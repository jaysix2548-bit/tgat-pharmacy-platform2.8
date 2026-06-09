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
const GENERATION_MODEL = 'gemini-3.5-flash';
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

function saveEmbeddingsCache(cache: Record<string, number[]>) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

// Helper to sleep/delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: any, retries = 5, delay = 5000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        console.warn(`⚠️ Rate limit hit (429). Sleeping for ${delay / 1000}s before retry...`);
        await sleep(delay);
        // Increase delay for subsequent retries
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

// -------------------------------------------------------------------------
// Load existing questions for Negative Constraints
// -------------------------------------------------------------------------
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
// API generation helpers
// -------------------------------------------------------------------------

async function generateSingleQuestion(
  section: string,
  difficulty: "Easy" | "Medium" | "Hard",
  partTitle: string,
  negativeScenarios: string[],
  additionalInstructions: string = ""
): Promise<GenQuestion> {
  await sleep(2000); // Throttling delay
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `You are a premium, state-of-the-art TGAT1 (English Communication) exam question generator.
Your target is to output a single, high-quality exam question.

Section: ${section}
Part Title: ${partTitle}
Target Difficulty: ${difficulty}

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

Ensure that the question is realistic, authentic, and feels like it came from an official TCAS exam.`;

  const requestPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          difficulty: { type: 'STRING', enum: ['Easy', 'Medium', 'Hard'] },
          topic: { type: 'STRING', description: 'Sub-category or theme (e.g. Hospital Check-in, Meeting Rescheduling, Food Court Conflict)' },
          text: { type: 'STRING', description: 'The main question prompt/dialogue. Use HTML <br> for line breaks in dialogues. Example: <b>Speaker A:</b> "Hello"<br><b>Speaker B:</b> "..."' },
          options: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            minItems: 4,
            maxItems: 4
          },
          answer: { type: 'INTEGER', description: '0-3 index of the correct/best option' },
          correctExplanation: { type: 'STRING', description: 'Detailed step-by-step explanation for the correct choice in Thai' },
          wrongExplanation: { type: 'STRING', description: 'Detailed analysis of why other options are incorrect/traps in Thai' },
          mindset: { type: 'STRING', description: 'Core communication mindset for students in Thai' },
          speedHack: { type: 'STRING', description: 'Speed tip/shortcut for students in Thai' },
          conceptTags: { type: 'STRING', description: 'Comma-separated keywords representing the concept tags' }
        },
        required: [
          'difficulty', 'topic', 'text', 'options', 'answer',
          'correctExplanation', 'wrongExplanation', 'mindset', 'speedHack', 'conceptTags'
        ]
      }
    }
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini single generation failed: ${response.status} - ${errorBody}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error(`Empty response content from Gemini candidate generation API.`);
  }

  const parsedQuestion: GenQuestion = JSON.parse(textResponse);
  parsedQuestion.section = section;
  parsedQuestion.partTitle = partTitle;
  parsedQuestion.passage = null;
  return parsedQuestion;
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
  await sleep(2000); // Throttling delay
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const typePrompt = type === 'Text Completion'
    ? `Generate a Text Completion passage (around 100-200 words) with ${difficulties.length} blank markers represented as [33], [34], etc., according to the target slots.
The questions array must have exactly ${difficulties.length} items. Question 1 corresponds to the first blank, Question 2 to the second, etc.
For each blank, the question prompt should just be 'Choose the best answer for blank [Number]'.`
    : `Generate a Reading Comprehension passage (around 150-300 words). The style should be: ${additionalInstructions} (e.g. workplace memo, announcement, letter, email, or magazine article).
Generate exactly ${difficulties.length} reading comprehension questions about this passage.
The questions should test main idea, detail, inference, tone, or developer intention.`;

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

  const requestPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
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
      }
    }
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini passage group generation failed: ${response.status} - ${errorBody}`);
  }

  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error(`Empty response content from Gemini candidate generation API.`);
  }

  const parsedGroup: PassageGroupGen = JSON.parse(textResponse);
  
  // Enforce difficulties match the requested targets
  parsedGroup.questions.forEach((q, idx) => {
    q.difficulty = difficulties[idx] || q.difficulty;
  });

  return parsedGroup;
}

// -------------------------------------------------------------------------
// Secondary validation check using LLM to confirm logic uniqueness
// -------------------------------------------------------------------------
async function secondaryLlmCheck(newQuestion: GenQuestion, similarQuestions: any[]): Promise<{ approved: boolean; reason: string }> {
  await sleep(2000); // Throttling delay
  if (similarQuestions.length === 0) return { approved: true, reason: 'No similar questions found to compare.' };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
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

  const instructions = `You are a strict TGAT exam quality auditor. Your job is to compare a new candidate question against similar historical matches and reject it if it is a duplicate, a slightly modified cosmetic rewrite, or uses the exact same scenario/reasoning chain.

${newFormatted}

Compare it against these close matches from the database:
${similarItemsFormatted}

REJECTION CRITIERIA:
Reject the new candidate if it matches any of the following with a historical match:
1. Same scenario with cosmetic changes (e.g. changing names, numbers, objects but keeping the story/logic the same).
2. Identical reasoning chain or logic structures.
3. Cosmetic rewrites of the question text.
4. Identical elimination strategies or identical trap-answer patterns.

Response Schema:
You must output a JSON object with:
- "approved": boolean (true if it is genuinely unique and does NOT match the rejection criteria, false if it should be rejected)
- "reason": string (a brief explanation of your decision, pointing out which matches are too similar if rejected)

Format requirement: JSON output only.`;

  const requestPayload = {
    contents: [{ parts: [{ text: instructions }] }],
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

  const response = await fetchWithRetry(url, {
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
// Main Generation Loop
// -------------------------------------------------------------------------

async function run() {
  console.log('🚀 TGAT1 FULL EXAM GENERATOR & REPLACER');
  console.log('--------------------------------------------------');

  try {
    const sheets = await getGoogleSheetsClient();
    const embeddingsCache = loadEmbeddingsCache();
    
    // 1. Fetch original questions for constraints & historical similarity checks
    const originalQuestions = getOriginalQuestions();
    console.log(`📊 Loaded ${originalQuestions.length} original questions from local src/data/tgat1.ts`);

    const negativeScenarios: string[] = originalQuestions.map(q => {
      // Short scenario summarize
      return q.text.replace(/<[^>]*>/g, '').slice(0, 100);
    });

    // We will build a pool of historical questions to check similarity against
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
      if (!embeddingsCache[h.questionId]) {
        console.log(`Vectorizing and caching original question ${h.questionId}...`);
        try {
          embeddingsCache[h.questionId] = await getEmbedding(h.questionText.slice(0, 1500));
          cacheUpdated = true;
        } catch (err: any) {
          console.warn(`⚠️ Failed to generate embedding for ${h.questionId}:`, err.message);
        }
      }
    }
    if (cacheUpdated) {
      saveEmbeddingsCache(embeddingsCache);
    }
    console.log('✅ Original questions embeddings loaded.');

    const finalQuestions: GenQuestion[] = [];

    // Helper: validate and process a candidate question
    async function processAndValidate(candidate: GenQuestion): Promise<boolean> {
      const candidateText = getFullTextForEmbedding(candidate);
      const candidateEmbedding = await getEmbedding(candidateText);

      let highestSimilarity = 0;
      let mostSimilarQuestion: any = null;
      const similarCandidatesList: any[] = [];

      for (const h of historyPool) {
        const hEmbedding = embeddingsCache[h.questionId];
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

      similarCandidatesList.sort((a, b) => b.score - a.score);
      const topMatches = similarCandidatesList.slice(0, 3).map(x => x.item);

      if (highestSimilarity > 0.75) {
        console.warn(`   ⚠️ Semantic similarity (${highestSimilarity.toFixed(4)}) with ${mostSimilarQuestion.questionId} exceeds the 0.75 threshold. Rejecting.`);
        return false;
      }

      const auditorResult = await secondaryLlmCheck(candidate, topMatches);
      if (!auditorResult.approved) {
        console.warn(`   ⚠️ Rejected by LLM Auditor. Reason: ${auditorResult.reason}`);
        return false;
      }

      // Add to our cache & pool
      const mockId = `TEMP-${finalQuestions.length + 1}`;
      embeddingsCache[mockId] = candidateEmbedding;
      historyPool.push({
        questionId: mockId,
        questionText: candidateText,
        conceptTags: candidate.topic,
        difficulty: candidate.difficulty,
      });

      return true;
    }

    // -------------------------------------------------------------------------
    // SLOT GENERATION SEQUENCE
    // -------------------------------------------------------------------------

    // A. Section 1: Question-Response (10 questions)
    console.log('\n--- Section 1: Question-Response (10 questions) ---');
    const qrSlots: { difficulty: "Easy" | "Medium" | "Hard"; est: number; sug: string }[] = [
      { difficulty: 'Easy', est: 20, sug: 'Suggested Time: 20s' },
      { difficulty: 'Easy', est: 25, sug: 'Suggested Time: 25s' },
      { difficulty: 'Medium', est: 50, sug: 'Suggested Time: 50s' },
      { difficulty: 'Easy', est: 30, sug: 'Suggested Time: 30s' },
      { difficulty: 'Medium', est: 55, sug: 'Suggested Time: 55s' },
      { difficulty: 'Hard', est: 80, sug: 'Suggested Time: 80s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' },
      { difficulty: 'Easy', est: 30, sug: 'Suggested Time: 30s' },
      { difficulty: 'Medium', est: 50, sug: 'Suggested Time: 50s' },
      { difficulty: 'Medium', est: 55, sug: 'Suggested Time: 55s' }
    ];

    for (let i = 0; i < qrSlots.length; i++) {
      const slot = qrSlots[i];
      const qIndex = i + 1;
      let approved = false;
      let attempts = 0;
      let candidate!: GenQuestion;

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating Q${qIndex} [Question-Response] (${slot.difficulty}) - Attempt #${attempts}...`);
        try {
          candidate = await generateSingleQuestion(
            'Conversation',
            slot.difficulty,
            'PART 1: CONVERSATION (Question-Response)',
            negativeScenarios,
            'This must be a Question-Response item: one speaker says something, and we select the reply.'
          );
          approved = await processAndValidate(candidate);
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique question for slot Q${qIndex}`);
      }

      candidate.id = `T1-${String(qIndex).padStart(3, '0')}`;
      candidate.estimatedTime = slot.est;
      candidate.suggestedTime = slot.sug;
      finalQuestions.push(candidate);
      negativeScenarios.push(candidate.text.slice(0, 100));
      console.log(`✅ Q${qIndex} generated successfully: "${candidate.topic}"`);
    }

    // B. Section 2: Short Conversations (12 questions)
    console.log('\n--- Section 2: Short Conversations (12 questions) ---');
    const scSlots: { difficulty: "Easy" | "Medium" | "Hard"; est: number; sug: string }[] = [
      { difficulty: 'Easy', est: 30, sug: 'Suggested Time: 30s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' },
      { difficulty: 'Easy', est: 35, sug: 'Suggested Time: 35s' },
      { difficulty: 'Medium', est: 55, sug: 'Suggested Time: 55s' },
      { difficulty: 'Hard', est: 90, sug: 'Suggested Time: 90s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' },
      { difficulty: 'Easy', est: 30, sug: 'Suggested Time: 30s' },
      { difficulty: 'Medium', est: 65, sug: 'Suggested Time: 65s' },
      { difficulty: 'Hard', est: 85, sug: 'Suggested Time: 85s' },
      { difficulty: 'Medium', est: 55, sug: 'Suggested Time: 55s' },
      { difficulty: 'Easy', est: 30, sug: 'Suggested Time: 30s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' }
    ];

    for (let i = 0; i < scSlots.length; i++) {
      const slot = scSlots[i];
      const qIndex = 11 + i;
      let approved = false;
      let attempts = 0;
      let candidate!: GenQuestion;

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating Q${qIndex} [Short Conversation] (${slot.difficulty}) - Attempt #${attempts}...`);
        try {
          candidate = await generateSingleQuestion(
            'Conversation',
            slot.difficulty,
            'PART 1: CONVERSATION (Short Conversations)',
            negativeScenarios,
            'This must be a Short Conversation item: 2-3 turns of dialogue between two speakers.'
          );
          approved = await processAndValidate(candidate);
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique question for slot Q${qIndex}`);
      }

      candidate.id = `T1-${String(qIndex).padStart(3, '0')}`;
      candidate.estimatedTime = slot.est;
      candidate.suggestedTime = slot.sug;
      finalQuestions.push(candidate);
      negativeScenarios.push(candidate.text.slice(0, 100));
      console.log(`✅ Q${qIndex} generated successfully: "${candidate.topic}"`);
    }

    // C. Section 3: Long Conversations (10 questions)
    console.log('\n--- Section 3: Long Conversations (10 questions) ---');
    const lcSlots: { difficulty: "Easy" | "Medium" | "Hard"; est: number; sug: string }[] = [
      { difficulty: 'Easy', est: 40, sug: 'Suggested Time: 40s' },
      { difficulty: 'Medium', est: 70, sug: 'Suggested Time: 70s' },
      { difficulty: 'Hard', est: 95, sug: 'Suggested Time: 95s' },
      { difficulty: 'Medium', est: 65, sug: 'Suggested Time: 65s' },
      { difficulty: 'Easy', est: 40, sug: 'Suggested Time: 40s' },
      { difficulty: 'Medium', est: 70, sug: 'Suggested Time: 70s' },
      { difficulty: 'Hard', est: 100, sug: 'Suggested Time: 100s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' },
      { difficulty: 'Medium', est: 65, sug: 'Suggested Time: 65s' },
      { difficulty: 'Hard', est: 90, sug: 'Suggested Time: 90s' }
    ];

    for (let i = 0; i < lcSlots.length; i++) {
      const slot = lcSlots[i];
      const qIndex = 23 + i;
      let approved = false;
      let attempts = 0;
      let candidate!: GenQuestion;

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating Q${qIndex} [Long Conversation] (${slot.difficulty}) - Attempt #${attempts}...`);
        try {
          candidate = await generateSingleQuestion(
            'Conversation',
            slot.difficulty,
            'PART 1: CONVERSATION (Long Conversations)',
            negativeScenarios,
            'This must be a Long Conversation item: 4-6 turns of dialogue between two speakers.'
          );
          approved = await processAndValidate(candidate);
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique question for slot Q${qIndex}`);
      }

      candidate.id = `T1-${String(qIndex).padStart(3, '0')}`;
      candidate.estimatedTime = slot.est;
      candidate.suggestedTime = slot.sug;
      finalQuestions.push(candidate);
      negativeScenarios.push(candidate.text.slice(0, 100));
      console.log(`✅ Q${qIndex} generated successfully: "${candidate.topic}"`);
    }

    // D. Section 4: Text Completion (8 questions - 2 passages of 4 questions each)
    console.log('\n--- Section 4: Text Completion (8 questions, 2 passages) ---');
    const tcPassages: {
      startIdx: number;
      difficulties: ("Easy" | "Medium" | "Hard")[];
      ests: number[];
      sugs: string[];
    }[] = [
      {
        startIdx: 33,
        difficulties: ['Easy', 'Medium', 'Medium', 'Hard'],
        ests: [35, 60, 65, 90],
        sugs: ['Suggested Time: 35s', 'Suggested Time: 60s', 'Suggested Time: 65s', 'Suggested Time: 90s']
      },
      {
        startIdx: 37,
        difficulties: ['Easy', 'Medium', 'Medium', 'Medium'],
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

          // Validate all questions in the group
          let allSubQuestionsValid = true;
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
            const valid = await processAndValidate(tempQ);
            if (!valid) {
              allSubQuestionsValid = false;
              break;
            }
          }
          approved = allSubQuestionsValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique passage group for Text Completion Passage #${pIdx + 1}`);
      }

      // Format and push the questions
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
        console.log(`   ✅ Q${finalQIndex} loaded: "${candidate.topic}"`);
      });
      negativeScenarios.push(groupResult.passage.slice(0, 150));
    }

    // E. Section 5: Reading Comprehension (14 questions - 3 passages: 4, 5, 5 questions)
    console.log('\n--- Section 5: Reading Comprehension (14 questions, 3 passages) ---');
    const rcPassages: {
      startIdx: number;
      difficulties: ("Easy" | "Medium" | "Hard")[];
      ests: number[];
      sugs: string[];
      style: string;
    }[] = [
      {
        startIdx: 41,
        difficulties: ['Easy', 'Medium', 'Easy', 'Hard'],
        ests: [40, 65, 35, 95],
        sugs: ['Suggested Time: 40s', 'Suggested Time: 65s', 'Suggested Time: 35s', 'Suggested Time: 95s'],
        style: 'Workplace Memo or Announcement (Direct details, explicit logic)'
      },
      {
        startIdx: 45,
        difficulties: ['Easy', 'Medium', 'Medium', 'Hard', 'Hard'],
        ests: [40, 70, 75, 100, 95],
        sugs: ['Suggested Time: 40s', 'Suggested Time: 70s', 'Suggested Time: 75s', 'Suggested Time: 100s', 'Suggested Time: 95s'],
        style: 'Product Launch Update or Clinical Trial Summary (Scientific/Medical data interpretation, moderate ambiguity)'
      },
      {
        startIdx: 50,
        difficulties: ['Easy', 'Medium', 'Medium', 'Medium', 'Hard'],
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

          // Validate all questions in the group
          let allSubQuestionsValid = true;
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
            const valid = await processAndValidate(tempQ);
            if (!valid) {
              allSubQuestionsValid = false;
              break;
            }
          }
          approved = allSubQuestionsValid;
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique passage group for Reading Comprehension Passage #${pIdx + 1}`);
      }

      // Format and push the questions
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
        console.log(`   ✅ Q${finalQIndex} loaded: "${candidate.topic}"`);
      });
      negativeScenarios.push(groupResult.passage.slice(0, 150));
    }

    // F. Section 6: Grammar (6 questions)
    console.log('\n--- Section 6: Grammar (6 questions) ---');
    const gramSlots: { difficulty: "Easy" | "Medium" | "Hard"; est: number; sug: string }[] = [
      { difficulty: 'Easy', est: 35, sug: 'Suggested Time: 35s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' },
      { difficulty: 'Easy', est: 30, sug: 'Suggested Time: 30s' },
      { difficulty: 'Medium', est: 65, sug: 'Suggested Time: 65s' },
      { difficulty: 'Hard', est: 90, sug: 'Suggested Time: 90s' },
      { difficulty: 'Medium', est: 60, sug: 'Suggested Time: 60s' }
    ];

    for (let i = 0; i < gramSlots.length; i++) {
      const slot = gramSlots[i];
      const qIndex = 55 + i;
      let approved = false;
      let attempts = 0;
      let candidate!: GenQuestion;

      while (!approved && attempts < 5) {
        attempts++;
        console.log(`⏳ Generating Q${qIndex} [Grammar in Context] (${slot.difficulty}) - Attempt #${attempts}...`);
        try {
          candidate = await generateSingleQuestion(
            'Grammar',
            slot.difficulty,
            'PART 4: GRAMMAR IN CONTEXT',
            negativeScenarios,
            'This must be a Grammar in Context item: tests correct syntax, tense, preposition, or clause structure within a communication context.'
          );
          approved = await processAndValidate(candidate);
        } catch (e: any) {
          console.error(`   ⚠️ Error: ${e.message}`);
        }
      }

      if (!approved) {
        throw new Error(`Failed to generate a valid unique question for slot Q${qIndex}`);
      }

      candidate.id = `T1-${String(qIndex).padStart(3, '0')}`;
      candidate.estimatedTime = slot.est;
      candidate.suggestedTime = slot.sug;
      finalQuestions.push(candidate);
      negativeScenarios.push(candidate.text.slice(0, 100));
      console.log(`✅ Q${qIndex} generated successfully: "${candidate.topic}"`);
    }

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
    saveEmbeddingsCache(embeddingsCache);
    console.log('🎉 Generation completed and fully synchronized.');

  } catch (error: any) {
    console.error('❌ Critical Error during generation flow:', error.message || error);
    process.exit(1);
  }
}

run();
