import { TGAT1_QUESTIONS } from "../src/data/tgat1";
import { TGAT2_QUESTIONS } from "../src/data/tgat2";
import { TGAT3_QUESTIONS } from "../src/data/tgat3";

function validateExam(name: string, questions: any[]) {
  let errors = 0;
  console.log(`\n🔍 Validating ${name}...`);
  
  const expectedLength = name.includes("TGAT2") ? 5 : 4;
  const maxAnswerIndex = expectedLength - 1;

  questions.forEach((q, idx) => {
    // 1. Check ID
    if (!q.id) {
      console.error(`❌ Question at index ${idx} missing ID`);
      errors++;
    }
    // 2. Check Options length
    if (!q.options || q.options.length !== expectedLength) {
      console.error(`❌ Question ${q.id} must have exactly ${expectedLength} options`);
      errors++;
    }
    // 3. Check Answer range
    if (q.answer < 0 || q.answer > maxAnswerIndex) {
      console.error(`❌ Question ${q.id} answer index ${q.answer} out of bounds (must be 0-${maxAnswerIndex})`);
      errors++;
    }
    // 4. Check Explanations
    if (!q.correctExplanation || !q.wrongExplanation) {
      console.error(`❌ Question ${q.id} missing explanations`);
      errors++;
    }
  });

  if (errors === 0) {
    console.log(`✅ ${name} passed validation (${questions.length} questions)`);
  } else {
    console.log(`⚠️ ${name} has ${errors} errors!`);
  }
  return errors;
}

function run() {
  let totalErrors = 0;
  totalErrors += validateExam("TGAT1", TGAT1_QUESTIONS);
  totalErrors += validateExam("TGAT2", TGAT2_QUESTIONS);
  totalErrors += validateExam("TGAT3", TGAT3_QUESTIONS);

  if (totalErrors > 0) {
    console.error(`\n🚨 Validation Failed with ${totalErrors} total errors.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All Question Banks Validated Successfully!`);
  }
}

run();
