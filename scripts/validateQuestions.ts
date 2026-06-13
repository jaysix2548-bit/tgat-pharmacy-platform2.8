import fs from "fs";
import path from "path";
import { TGAT1_QUESTIONS } from "../src/data/tgat1";
import { TGAT2_QUESTIONS } from "../src/data/tgat2";
import { TGAT3_QUESTIONS } from "../src/data/tgat3";

function validateExam(name: string, questions: any[]) {
  let errors = 0;
  let warnings = 0;
  console.log(`\n🔍 Validating ${name}...`);
  
  const expectedLength = name.includes("TGAT2") ? 5 : 4;
  const maxAnswerIndex = expectedLength - 1;

  // Track unique IDs to find duplicates
  const ids = new Set<string>();

  questions.forEach((q, idx) => {
    const qId = q.id || `index_${idx}`;

    // 1. Check ID
    if (!q.id) {
      console.error(`❌ Question at index ${idx} missing ID`);
      errors++;
    } else {
      if (ids.has(q.id)) {
        console.error(`❌ Question ${q.id} is a duplicate ID`);
        errors++;
      }
      ids.add(q.id);
    }

    // 2. Check Options length
    if (!q.options || q.options.length !== expectedLength) {
      console.error(`❌ Question ${qId} must have exactly ${expectedLength} options`);
      errors++;
    }

    // 3. Check Answer range
    if (q.answer === undefined || q.answer < 0 || q.answer > maxAnswerIndex) {
      console.error(`❌ Question ${qId} answer index ${q.answer} out of bounds (must be 0-${maxAnswerIndex})`);
      errors++;
    }

    // 4. Check Explanations
    if (!q.correctExplanation || !q.wrongExplanation) {
      console.error(`❌ Question ${qId} missing explanations`);
      errors++;
    }

    // 5. Image / SVG Validations
    const combinedText = `${q.text || ""} ${q.passage || ""} ${q.question || ""}`;
    
    // Find all img src attributes using regex
    const imgRegex = /<img\s+[^>]*src=['"]([^'"]+)['"]/gi;
    let match;
    let hasImgTag = false;
    
    while ((match = imgRegex.exec(combinedText)) !== null) {
      hasImgTag = true;
      const imgSrc = match[1];
      
      // Resolve path relative to the public directory
      // e.g. /images/exams/arrow_pattern.svg -> public/images/exams/arrow_pattern.svg
      const relativePath = imgSrc.startsWith("/") ? imgSrc.slice(1) : imgSrc;
      const absolutePath = path.join(process.cwd(), "public", relativePath);
      
      if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Question ${qId} references missing image file: ${imgSrc} (resolved to: ${absolutePath})`);
        errors++;
      } else {
        // Confirm it is not an empty file
        const stats = fs.statSync(absolutePath);
        if (stats.size === 0) {
          console.error(`❌ Question ${qId} references empty image file: ${imgSrc}`);
          errors++;
        }
      }
    }

    // Heuristic check: search for Thai keywords pointing to a diagram/image
    const imageKeywords = [
      "จากรูป", "ดังรูป", "ในรูป", "จากภาพ", "ดังภาพ", "ในภาพ", 
      "รูปด้านล่าง", "ภาพด้านล่าง", "รูปประกอบ", "ภาพประกอบ",
      "ตามรูป", "ตามภาพ", "แสดงในรูป", "แสดงในภาพ"
    ];
    
    const containsKeyword = imageKeywords.some(keyword => {
      if (keyword === "ในรูป") {
        // Exclude "ในรูปแบบ", "ในรูปธรรม", etc.
        const regex = /ในรูป(?!แบบ|ธรรม|พรรณ|รอย)/g;
        return regex.test(combinedText);
      }
      return combinedText.includes(keyword);
    });
    if (containsKeyword && !hasImgTag) {
      console.warn(`⚠️ Warning in Question ${qId}: Text references a figure/diagram (e.g. "จากรูป" or "จากภาพ"), but no <img> tag was found.`);
      warnings++;
    }
  });

  if (errors === 0) {
    console.log(`✅ ${name} passed validation (${questions.length} questions). Warnings: ${warnings}`);
  } else {
    console.log(`⚠️ ${name} has ${errors} errors, ${warnings} warnings!`);
  }
  return { errors, warnings };
}

function run() {
  let totalErrors = 0;
  let totalWarnings = 0;

  const result1 = validateExam("TGAT1", TGAT1_QUESTIONS);
  const result2 = validateExam("TGAT2", TGAT2_QUESTIONS);
  const result3 = validateExam("TGAT3", TGAT3_QUESTIONS);

  totalErrors += result1.errors + result2.errors + result3.errors;
  totalWarnings += result1.warnings + result2.warnings + result3.warnings;

  if (totalErrors > 0) {
    console.error(`\n🚨 Validation Failed with ${totalErrors} total errors and ${totalWarnings} warnings.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All Question Banks Validated Successfully with ${totalWarnings} warnings!`);
  }
}

run();
