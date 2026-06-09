/**
 * Question Database Validation Script
 * Verifies IDs, sequential numbering, answer indices, required fields, and types.
 */
const fs = require('fs');
const path = require('path');

// Simulate imports by reading generated TS files and using simple regex parsing or executing inside Node
function loadQuestionsFromTS(filePath, arrayName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Extract JSON string from "export const ARRAY_NAME: ... = [ ... ];"
  const startIdx = content.indexOf(`export const ${arrayName}`);
  const bracketIdx = content.indexOf('[', startIdx);
  const endIdx = content.lastIndexOf('];');
  
  const jsonStr = content.substring(bracketIdx, endIdx + 1);
  try {
    return eval(jsonStr);
  } catch (e) {
    console.error(`Failed to parse ${arrayName} from ${filePath}:`, e.message);
    return [];
  }
}

function validateQuestions() {
  console.log("==========================================");
  console.log("🔍 STARTING EXAM DATABASE INTEGRITY CHECKS");
  console.log("==========================================\n");

  const files = [
    {
      name: "TGAT1 (English)",
      path: path.join(__dirname, "../src/data/tgat1.ts"),
      array: "TGAT1_QUESTIONS",
      prefix: "T1-",
      expectedCount: 60,
    },
    {
      name: "TGAT2 (Logic & Critical)",
      path: path.join(__dirname, "../src/data/tgat2.ts"),
      array: "TGAT2_QUESTIONS",
      prefix: "T2-",
      expectedCount: 80,
    },
    {
      name: "TGAT3 (Workforce Competencies)",
      path: path.join(__dirname, "../src/data/tgat3.ts"),
      array: "TGAT3_QUESTIONS",
      prefix: "T3-",
      expectedCount: 60,
    },
  ];

  let totalErrors = 0;

  files.forEach((file) => {
    console.log(`Checking ${file.name}...`);
    
    if (!fs.existsSync(file.path)) {
      console.log(`❌ FILE NOT FOUND: ${file.path}`);
      totalErrors++;
      return;
    }

    const questions = loadQuestionsFromTS(file.path, file.array);
    console.log(`   Found ${questions.length} questions.`);

    if (questions.length !== file.expectedCount) {
      console.log(`   ⚠️ WARNING: Question count is ${questions.length}, expected exactly ${file.expectedCount}.`);
    }

    const idsSeen = new Set();
    
    questions.forEach((q, idx) => {
      const qIndexStr = String(idx + 1).padStart(3, '0');
      const expectedId = `${file.prefix}${qIndexStr}`;

      // 1. ID Format & Sequence Verification
      if (!q.id) {
        console.log(`   ❌ ERROR: Question at index ${idx} has NO ID!`);
        totalErrors++;
      } else {
        if (q.id !== expectedId) {
          console.log(`   ❌ ERROR: ID sequence mismatch at index ${idx}. Found '${q.id}', expected '${expectedId}'.`);
          totalErrors++;
        }
        if (idsSeen.has(q.id)) {
          console.log(`   ❌ ERROR: Duplicate ID detected! '${q.id}' is repeated.`);
          totalErrors++;
        }
        idsSeen.add(q.id);
      }

      // 2. Required Fields Verification
      const requiredFields = [
        'text', 'options', 'answer', 'correctExplanation', 
        'wrongExplanation', 'difficulty', 'topic', 'section'
      ];
      if (file.name.includes("TGAT1") || file.name.includes("TGAT2")) {
        requiredFields.push('mindset', 'speedHack', 'partTitle');
      }
      requiredFields.forEach((field) => {
        if (q[field] === undefined || q[field] === null || q[field] === '') {
          console.log(`   ❌ ERROR [${q.id}]: Missing required field '${field}'`);
          totalErrors++;
        }
      });

      // 3. Option Count & Answer Validity
      if (q.options && Array.isArray(q.options)) {
        if (q.options.length < 2) {
          console.log(`   ❌ ERROR [${q.id}]: Less than 2 options provided.`);
          totalErrors++;
        }
        if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
          console.log(`   ❌ ERROR [${q.id}]: Answer index '${q.answer}' is invalid for options count of ${q.options.length}.`);
          totalErrors++;
        }
      } else {
        console.log(`   ❌ ERROR [${q.id}]: 'options' is not a valid array.`);
        totalErrors++;
      }

      // 4. Difficulty Check
      const validDifficulties = ['Easy', 'Medium', 'Hard', 'Elite'];
      if (q.difficulty && !validDifficulties.includes(q.difficulty)) {
        console.log(`   ❌ ERROR [${q.id}]: Invalid difficulty value '${q.difficulty}'.`);
        totalErrors++;
      }
    });

    console.log(`   ${file.name} integrity checks complete!\n`);
  });

  console.log("==========================================");
  if (totalErrors === 0) {
    console.log("🌟 SUCCESS: DATABASE INTEGRITY VERIFIED (0 ERRORS)");
  } else {
    console.log(`❌ FAILURE: DATABASE INTEGRITY FAILED WITH ${totalErrors} ERRORS`);
  }
  console.log("==========================================");

  process.exit(totalErrors === 0 ? 0 : 1);
}

validateQuestions();
