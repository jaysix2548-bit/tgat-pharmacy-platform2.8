const fs = require('fs');
const path = require('path');

// Mock browser environment for safe eval execution of script files
global.document = {
  addEventListener: () => {},
  getElementById: () => ({
    addEventListener: () => {},
    setAttribute: () => {},
    removeAttribute: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} }
  }),
  querySelector: () => ({
    addEventListener: () => {},
    appendChild: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {} }
  }),
  querySelectorAll: () => []
};
global.window = {
  addEventListener: () => {},
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  scrollTo: () => {}
};
global.localStorage = global.window.localStorage;
global.sessionStorage = global.window.sessionStorage;

function migrateTGAT1() {
  console.log("Migrating TGAT1 questions...");
  const scriptPath = path.join(__dirname, "../public/script.js");
  let content = fs.readFileSync(scriptPath, "utf-8");
  
  // Force const rawQuestions to global.rawQuestions
  content = content.replace(/(const|let|var)\s+rawQuestions\s*=\s*\[/, "global.rawQuestions = [");
  
  global.rawQuestions = undefined;
  
  try {
    eval(content);
  } catch (e) {
    // Suppress secondary execution errors (DOM, events, etc.)
  }
  
  if (!global.rawQuestions || !Array.isArray(global.rawQuestions)) {
    console.error("❌ Failed to parse TGAT1 questions from public/script.js");
    return;
  }

  const rawQuestions = global.rawQuestions;
  console.log(`Successfully parsed ${rawQuestions.length} TGAT1 questions.`);

  const mappedQuestions = rawQuestions.map((q, idx) => {
    const qIndexStr = String(idx + 1).padStart(3, '0');
    const id = `T1-${qIndexStr}`;
    
    // Auto-map topic based on section
    let topic = "Conversation & Dialogue";
    if (q.section === "Vocabulary") {
      topic = "Vocabulary & Context Clues";
    } else if (q.section === "Reading") {
      topic = "Reading Comprehension";
    } else if (q.section === "Grammar & Structure" || q.section === "Structure & Writing") {
      topic = "Grammar & Sentence Structure";
    }

    // Distribute difficulty
    let difficulty = "Medium";
    if (idx < 12) difficulty = "Easy";
    else if (idx >= 12 && idx < 36) difficulty = "Medium";
    else if (idx >= 36 && idx < 54) difficulty = "Hard";
    else difficulty = "Elite";

    return {
      id,
      difficulty,
      topic,
      section: q.section || "English Communication",
      partTitle: q.partTitle || "Part 1: Conversation",
      suggestedTime: q.suggestedTime || "45s",
      estimatedTime: 60,
      frequency: "High",
      examWeight: 5,
      yearPattern: "2566-2567",
      text: q.text,
      passage: q.passage || null,
      options: q.options,
      answer: q.answer,
      correctExplanation: q.correctExplanation,
      wrongExplanation: q.wrongExplanation,
      mindset: q.mindset || "เน้นทักษะการฟัง พูด และจับใจความบริบทภาษาอังกฤษ",
      speedHack: q.speedHack || "วิเคราะห์คีย์เวิร์ดในตัวเลือกและบริบทบทสนทนา"
    };
  });

  const outputPath = path.join(__dirname, "../src/data/tgat1.ts");
  const outputContent = `import type { TGAT1Question } from "@/types/exam";\n\nexport const TGAT1_QUESTIONS: TGAT1Question[] = ${JSON.stringify(mappedQuestions, null, 2)};\n`;
  
  fs.writeFileSync(outputPath, outputContent, "utf-8");
  console.log(`✅ Saved ${mappedQuestions.length} questions to src/data/tgat1.ts\n`);
}

function migrateTGAT2() {
  console.log("Migrating TGAT2 questions...");
  const scriptPath = path.join(__dirname, "../public/tgat2-script.js");
  let content = fs.readFileSync(scriptPath, "utf-8");
  
  // Force const rawQuestions to global.rawQuestions
  content = content.replace(/(const|let|var)\s+rawQuestions\s*=\s*\[/, "global.rawQuestions = [");
  
  global.rawQuestions = undefined;
  
  try {
    eval(content);
  } catch (e) {}
  
  if (!global.rawQuestions || !Array.isArray(global.rawQuestions)) {
    console.error("❌ Failed to parse TGAT2 questions from public/tgat2-script.js");
    return;
  }

  const rawQuestions = global.rawQuestions;
  console.log(`Successfully parsed ${rawQuestions.length} TGAT2 questions.`);

  const mappedQuestions = rawQuestions.map((q, idx) => {
    // Map reasoningType based on section
    let reasoningType = "Logical";
    const sec = (q.section || "").toLowerCase();
    if (sec.includes("numerical")) reasoningType = "Numerical";
    else if (sec.includes("logical")) reasoningType = "Logical";
    else if (sec.includes("spatial")) reasoningType = "Spatial";
    else if (sec.includes("analytical")) reasoningType = "Analytical";
    else if (sec.includes("iq") || sec.includes("speed")) reasoningType = "Speed";

    return {
      id: q.id || `T2-${String(idx + 1).padStart(3, '0')}`,
      difficulty: q.difficulty || "Medium",
      topic: q.topic || "Logical Reasoning",
      subtopic: q.subtopic || "General",
      reasoningType,
      section: q.section || "Critical & Logical Thinking",
      partTitle: q.partTitle || "Part 2: Logical Reasoning",
      suggestedTime: q.suggestedTime || "45s",
      estimatedTime: 56,
      frequency: q.frequency || "High",
      examWeight: q.examWeight || 5,
      yearPattern: q.yearPattern || "2566-2567",
      text: q.text,
      passage: q.passage || null,
      options: q.options,
      answer: q.answer,
      correctExplanation: q.correctExplanation,
      wrongExplanation: q.wrongExplanation,
      mindset: q.mindset || "เน้นการคิดเชิงตรรกะและการวิเคราะห์เหตุผล",
      speedHack: q.speedHack || "ตัดตัวเลือกที่เป็นเท็จหรือไม่สมเหตุสมผลออกทันที"
    };
  });

  const outputPath = path.join(__dirname, "../src/data/tgat2.ts");
  const outputContent = `import type { TGAT2Question } from "@/types/exam";\n\nexport const TGAT2_QUESTIONS: TGAT2Question[] = ${JSON.stringify(mappedQuestions, null, 2)};\n`;
  
  fs.writeFileSync(outputPath, outputContent, "utf-8");
  console.log(`✅ Saved ${mappedQuestions.length} questions to src/data/tgat2.ts\n`);
}

function migrateTGAT3() {
  console.log("Migrating TGAT3 questions...");
  const scriptPath = path.join(__dirname, "../public/tgat3-script.js");
  let content = fs.readFileSync(scriptPath, "utf-8");
  
  // Force const rawQuestions to global.rawQuestions
  content = content.replace(/(const|let|var)\s+rawQuestions\s*=\s*\[/, "global.rawQuestions = [");
  
  global.rawQuestions = undefined;
  
  try {
    eval(content);
  } catch (e) {}
  
  if (!global.rawQuestions || !Array.isArray(global.rawQuestions)) {
    console.error("❌ Failed to parse TGAT3 questions from public/tgat3-script.js");
    return;
  }

  const rawQuestions = global.rawQuestions;
  console.log(`Successfully parsed ${rawQuestions.length} TGAT3 questions.`);

  const mappedQuestions = rawQuestions.map((q, idx) => {
    return {
      id: q.id || `T3-${String(idx + 1).padStart(3, '0')}`,
      difficulty: q.difficulty || "Medium",
      topic: q.topic || "Workplace Scenario",
      competency: q.competency || q.section || "Problem Solving",
      section: q.section || "Future Workforce Competencies",
      partTitle: q.partTitle || "Part 3: Workplace Competencies",
      suggestedTime: q.suggestedTime || "45s",
      estimatedTime: 60,
      frequency: q.frequency || "High",
      examWeight: q.examWeight || 5,
      yearPattern: q.yearPattern || "2566-2567",
      text: q.text,
      passage: q.passage || null,
      options: q.options,
      answer: q.answer,
      correctExplanation: q.correctExplanation,
      wrongExplanation: q.wrongExplanation,
      mindset: q.mindset || "เน้นการแก้ไขปัญหาในที่ทำงานและสมรรถนะวิชาชีพ",
      speedHack: q.speedHack || "เลือกช้อยส์ที่มีความรับผิดชอบและให้ความปลอดภัยสูงสุด"
    };
  });

  const outputPath = path.join(__dirname, "../src/data/tgat3.ts");
  const outputContent = `import type { TGAT3Question } from "@/types/exam";\n\nexport const TGAT3_QUESTIONS: TGAT3Question[] = ${JSON.stringify(mappedQuestions, null, 2)};\n`;
  
  fs.writeFileSync(outputPath, outputContent, "utf-8");
  console.log(`✅ Saved ${mappedQuestions.length} questions to src/data/tgat3.ts\n`);
}

function run() {
  console.log("🚀 STARTING QUESTION DATA MIGRATION SCRIPTS...");
  migrateTGAT1();
  migrateTGAT2();
  migrateTGAT3();
  console.log("🌟 MIGRATION COMPLETED SUCCESSFULLY!");
}

run();
