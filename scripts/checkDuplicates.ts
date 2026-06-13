import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TGAT1_QUESTIONS } from '../src/data/tgat1';
import { TGAT2_QUESTIONS } from '../src/data/tgat2';
import { TGAT3_QUESTIONS } from '../src/data/tgat3';

// Load environment variables
loadEnvConfig(process.cwd());
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-2';
const CACHE_PATH = path.join(process.cwd(), 'scripts', 'embeddings_cache.json');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getHash(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, '') // remove HTML tags
    .replace(/[\s\p{P}]/gu, '') // remove spaces and punctuation
    .toLowerCase();
}

function getFullTextForEmbedding(q: any): string {
  const parts = [
    q.text || '',
    q.passage || '',
    q.question || '',
    ...(q.options || [])
  ];
  return parts.filter(Boolean).join(' | ');
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getEmbedding(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] }
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Embedding API error: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  return result.embedding.values;
}

interface CacheEntry {
  hash: string;
  embedding: number[];
}

function loadCache(): Record<string, CacheEntry> {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      const upgraded: Record<string, CacheEntry> = {};
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && 'hash' in val && 'embedding' in val) {
          upgraded[key] = val as CacheEntry;
        }
      }
      return upgraded;
    } catch {
      return {};
    }
  }
  return {};
}

async function ensureEmbeddings(questions: any[], cache: Record<string, CacheEntry>) {
  console.log(`⏳ Verifying/generating embeddings for ${questions.length} questions...`);
  let updatedCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const text = getFullTextForEmbedding(q);
    const hash = getHash(text);

    const cached = cache[q.id];
    if (!cached || cached.hash !== hash) {
      console.log(`   [${i + 1}/${questions.length}] Generating embedding for ${q.id}...`);
      try {
        const embedding = await getEmbedding(text);
        cache[q.id] = { hash, embedding };
        updatedCount++;
        await sleep(150); // Small delay to avoid hitting rate limits
      } catch (err: any) {
        console.error(`❌ Error vectorizing ${q.id}:`, err.message);
      }
    }
  }

  if (updatedCount > 0) {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`✅ Embedding cache updated. Saved ${updatedCount} new embeddings.`);
  } else {
    console.log(`✅ Embeddings cache is fully up-to-date.`);
  }
}

interface DuplicateResult {
  exactDuplicates: string[][];
  normalizedDuplicates: string[][];
  optionsDuplicates: string[][];
  semanticNearDuplicates: { q1: string; q2: string; similarity: number }[];
}

function checkSubjectDuplicates(
  subject: string,
  questions: any[],
  cache: Record<string, CacheEntry>
): DuplicateResult {
  console.log(`\n🔍 Auditing ${subject} database (${questions.length} questions)...`);

  const exactDuplicates: string[][] = [];
  const normalizedDuplicates: string[][] = [];
  const optionsDuplicates: string[][] = [];
  const semanticNearDuplicates: { q1: string; q2: string; similarity: number }[] = [];

  const exactMap = new Map<string, string[]>();
  const normMap = new Map<string, string[]>();
  const optionsMap = new Map<string, string[]>();

  questions.forEach(q => {
    const rawText = q.text || q.question || '';
    const normText = normalizeText(rawText);
    const sortedOptions = [...(q.options || [])].sort().join('||');

    if (rawText) {
      if (!exactMap.has(rawText)) exactMap.set(rawText, []);
      exactMap.get(rawText)!.push(q.id);
    }

    if (normText) {
      if (!normMap.has(normText)) normMap.set(normText, []);
      normMap.get(normText)!.push(q.id);
    }

    if (sortedOptions) {
      if (!optionsMap.has(sortedOptions)) optionsMap.set(sortedOptions, []);
      optionsMap.get(sortedOptions)!.push(q.id);
    }
  });

  exactMap.forEach((ids) => {
    if (ids.length > 1) exactDuplicates.push(ids);
  });

  normMap.forEach((ids) => {
    if (ids.length > 1) {
      const isAlreadyExact = exactDuplicates.some(exactIds => 
        ids.every(id => exactIds.includes(id))
      );
      if (!isAlreadyExact) normalizedDuplicates.push(ids);
    }
  });

  optionsMap.forEach((ids) => {
    if (ids.length > 1) optionsDuplicates.push(ids);
  });

  // Semantic Similarity check
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const q1 = questions[i];
      const q2 = questions[j];
      const entry1 = cache[q1.id];
      const entry2 = cache[q2.id];

      if (entry1 && entry2) {
        const similarity = cosineSimilarity(entry1.embedding, entry2.embedding);
        if (similarity > 0.85) {
          semanticNearDuplicates.push({ q1: q1.id, q2: q2.id, similarity });
        }
      }
    }
  }

  // Print Report
  if (exactDuplicates.length > 0) {
    console.error(`❌ Found ${exactDuplicates.length} groups of EXACT text duplicates:`);
    exactDuplicates.forEach((group, idx) => console.error(`   Group ${idx + 1}: ${group.join(', ')}`));
  } else {
    console.log(`✅ No exact text duplicates found.`);
  }

  if (normalizedDuplicates.length > 0) {
    console.warn(`⚠️ Found ${normalizedDuplicates.length} groups of NEAR (normalized) text duplicates:`);
    normalizedDuplicates.forEach((group, idx) => console.warn(`   Group ${idx + 1}: ${group.join(', ')}`));
  } else {
    console.log(`✅ No normalized text duplicates found.`);
  }

  if (optionsDuplicates.length > 0) {
    console.warn(`⚠️ Found ${optionsDuplicates.length} groups sharing identical option sets:`);
    optionsDuplicates.forEach((group, idx) => console.warn(`   Group ${idx + 1}: ${group.join(', ')}`));
  } else {
    console.log(`✅ No duplicate option sets found.`);
  }

  if (semanticNearDuplicates.length > 0) {
    semanticNearDuplicates.sort((a, b) => b.similarity - a.similarity);
    console.warn(`⚠️ Found ${semanticNearDuplicates.length} pairs with HIGH semantic similarity (> 0.85):`);
    // Print top 10 most similar
    semanticNearDuplicates.slice(0, 10).forEach(pair => {
      console.warn(`   - Pair: ${pair.q1} & ${pair.q2} (Similarity: ${pair.similarity.toFixed(4)})`);
    });
    if (semanticNearDuplicates.length > 10) {
      console.warn(`   ... and ${semanticNearDuplicates.length - 10} more pairs.`);
    }
  } else {
    console.log(`✅ No high semantic similarity matches (>0.85) found.`);
  }

  return { exactDuplicates, normalizedDuplicates, optionsDuplicates, semanticNearDuplicates };
}

async function run() {
  console.log("🚀 STARTING DYNAMIC QUESTION DUPLICATION AUDIT...");

  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set. Cannot run semantic checks.");
    process.exit(1);
  }

  const cache = loadCache();
  const allQuestions = [...TGAT1_QUESTIONS, ...TGAT2_QUESTIONS, ...TGAT3_QUESTIONS];

  // Refresh cache
  await ensureEmbeddings(allQuestions, cache);

  const t1 = checkSubjectDuplicates('TGAT1', TGAT1_QUESTIONS, cache);
  const t2 = checkSubjectDuplicates('TGAT2', TGAT2_QUESTIONS, cache);
  const t3 = checkSubjectDuplicates('TGAT3', TGAT3_QUESTIONS, cache);

  console.log("\n======================================================");
  const totalExact = t1.exactDuplicates.length + t2.exactDuplicates.length + t3.exactDuplicates.length;
  const totalNorm = t1.normalizedDuplicates.length + t2.normalizedDuplicates.length + t3.normalizedDuplicates.length;
  const totalSemantic = t1.semanticNearDuplicates.length + t2.semanticNearDuplicates.length + t3.semanticNearDuplicates.length;

  if (totalExact > 0) {
    console.error(`🚨 AUDIT FAIL: Found ${totalExact} exact duplicate groups in the database!`);
    process.exit(1);
  } else {
    console.log(`🎉 AUDIT SUCCESS: 0 exact duplicate questions found.`);
    if (totalNorm > 0 || totalSemantic > 0) {
      console.log(`💡 Note: Review the warnings above to check if any high-similarity questions are conceptual duplicates.`);
    }
  }
}

run();
