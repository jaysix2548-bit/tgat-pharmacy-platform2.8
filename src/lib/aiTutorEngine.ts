import type { ExamResult, MistakeEntry, Question, ExamId, Difficulty } from "@/types/exam";
import type { AIWeaknessReport, AIStudyRecommendation, AIGeneratedQuestion } from "@/types/ai";
import { TGAT1_QUESTIONS } from "@/data/tgat1";
import { TGAT2_QUESTIONS } from "@/data/tgat2";
import { TGAT3_QUESTIONS } from "@/data/tgat3";

/**
 * Calculates a cumulative weakness report across all main syllabus topics.
 */
export function generateWeaknessReports(
  examHistory: ExamResult[],
  mistakes: Record<string, MistakeEntry>
): AIWeaknessReport[] {
  const reports: AIWeaknessReport[] = [];
  const mistakesList = Object.values(mistakes);

  // Group mistakes and attempts by syllabus topics
  const topicsMap: Record<
    string,
    {
      attempts: number;
      correct: number;
      mistakes: number;
      examId: ExamId;
      pattern: string;
      concept: string;
    }
  > = {};

  // Standard defaults for initial mapping
  const topicDetails: Record<string, { examId: ExamId; pattern: string; concept: string }> = {
    "Conversation & Dialogue": {
      examId: "tgat1",
      pattern: "มักพลาดช้อยส์กับดักความสุภาพที่ขัดกับหลักวิชาชีพหรือกฎระเบียบ",
      concept: "ทบทวนการมองหาช้อยส์ที่แก้ปัญหาเป็นขั้นตอนและสุภาพแบบ Patient-Centered",
    },
    "Vocabulary & Context Clues": {
      examId: "tgat1",
      pattern: "สับสนกับคำที่มีทิศทางความหมายตรงกันข้าม (Synonyms vs Antonyms)",
      concept: "สร้างการจำคำผ่านกลุ่มบริบททางแพทย์ชีวภาพ (Bio-medical collocations)",
    },
    "Reading Comprehension": {
      examId: "tgat1",
      pattern: "ใช้เวลาอ่านบทความยาวเกินไป ทำให้จับประเด็นใจความสำคัญไม่ทัน",
      concept: "ฝึกทักษะการสแกนหาข้อความส่วนคำถามก่อนอ่านเจาะลึกพารากราฟต้นเรื่อง",
    },
    "Numerical Reasoning": {
      examId: "tgat2",
      pattern: "มองข้ามผลต่างชั้นที่สอง (Second Difference) ในอนุกรมซับซ้อน",
      concept: "ฝึกมองความสัมพันธ์แบบขั้นบันไดและสูตรเพิ่มสองมิติทันที",
    },
    "Logical Reasoning": {
      examId: "tgat2",
      pattern: "สับสนตารางตรรกศาสตร์และความสมเหตุสมผลของการจับคู่เงื่อนไข",
      concept: "ทบทวนการขีดเขียนแผนผังความสัมพันธ์ตรรกะแบบ Venn-Diagram",
    },
    "Spatial Reasoning": {
      examId: "tgat2",
      pattern: "ใช้พลังจินตนาการหมุนแผ่นคลี่ 3D นานจนเวลาข้อขวดค้างระบบ",
      concept: "ใช้กลยุทธ์ Opposite Faces rule ตัดช้อยส์กล่องตรงกันข้ามทันที",
    },
    "Ethics & Integrity": {
      examId: "tgat3",
      pattern: "หลงกลช้อยส์ที่ดูใจดีช่วยเหลือแต่ขัดต่อหลักการความปลอดภัยวิชาชีพ",
      concept: "ตอบโดยยึดมั่นกฎหมายหลักสูตรควบคู่ทางประนีประนอมที่เป็นประโยชน์",
    },
    "Communication & Collaboration": {
      examId: "tgat3",
      pattern: "เลือกช้อยส์ตอบโต้ด้วยการใช้อารมณ์หรือเลี่ยงการสื่อสารกับเพื่อนร่วมงาน",
      concept: "เลือกทางออกการปรึกษาอย่างสร้างสรรค์และรักษาความสัมพันธ์ทีมสม่ำเสมอ",
    },
    "Teamwork & Synergy": {
      examId: "tgat3",
      pattern: "เลือกข้อที่มีแนวคิดแบบ Solo-worker ที่เน้นทำงานคนเดียวเพื่อคุณภาพงาน",
      concept: "เน้นการประสานงาน ปันส่วนภาระงาน และสนับสนุนความหลากหลายของทีม",
    },
  };

  // Populate base mapping
  Object.entries(topicDetails).forEach(([topic, details]) => {
    topicsMap[topic] = {
      attempts: 0,
      correct: 0,
      mistakes: 0,
      examId: details.examId,
      pattern: details.pattern,
      concept: details.concept,
    };
  });

  // Aggregate mistake logs
  mistakesList.forEach((m) => {
    // Find matching question details to discover exact topic
    let q = TGAT1_QUESTIONS.find((x) => x.id === m.questionId) as Question | undefined;
    if (!q) q = TGAT2_QUESTIONS.find((x) => x.id === m.questionId);
    if (!q) q = TGAT3_QUESTIONS.find((x) => x.id === m.questionId);

    if (q && topicsMap[q.topic]) {
      topicsMap[q.topic].mistakes += m.attempts - m.correct;
      topicsMap[q.topic].attempts += m.attempts;
      topicsMap[q.topic].correct += m.correct;
    }
  });

  // Calculate stats
  Object.entries(topicsMap).forEach(([topic, stats]) => {
    const totalHistoryAttempts = examHistory.filter((h) => h.examId === stats.examId).length;
    const finalAttempts = stats.attempts + totalHistoryAttempts * 2;
    const finalCorrect = stats.correct + totalHistoryAttempts * 1.4; // baseline history

    const rawAccuracy = finalAttempts > 0 ? (finalCorrect / finalAttempts) * 100 : 85;
    const finalAccuracy = Math.max(10, Math.min(100, Math.round(rawAccuracy - stats.mistakes * 5)));

    reports.push({
      topic,
      examId: stats.examId,
      accuracy: finalAccuracy,
      attemptsCount: Math.round(finalAttempts),
      correctCount: Math.round(finalCorrect),
      mistakesCount: stats.mistakes,
      commonErrorPattern: stats.pattern,
      remedialConcept: stats.concept,
    });
  });

  // Sort by lowest accuracy first (most critical weaknesses)
  return reports.sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Generates custom time-budget recommendations.
 */
export function generateRecommendations(
  reports: AIWeaknessReport[]
): AIStudyRecommendation[] {
  const recs: AIStudyRecommendation[] = [];

  // Filter out top 3 weakest topics
  const weakest = reports.slice(0, 3);

  weakest.forEach((report, index) => {
    let priority: "High" | "Medium" | "Low" = "High";
    let minutes = 45;
    
    if (index === 1) {
      priority = "Medium";
      minutes = 30;
    } else if (index === 2) {
      priority = "Medium";
      minutes = 20;
    }

    if (report.accuracy >= 75) {
      priority = "Low";
      minutes = 15;
    }

    recs.push({
      topic: report.topic,
      examId: report.examId,
      priority,
      targetStudyMinutes: minutes,
      dailyboosterQuest: `ลุยโจทย์ Booster พาร์ท ${report.topic} จำนวน 5 ข้อเพื่อสยบกลลวงข้อสอบ`,
    });
  });

  return recs;
}

/**
 * Generates customized interactive drill questions.
 */
export function generateAIQuestion(
  topic: string,
  difficulty: Difficulty,
  examId: ExamId
): AIGeneratedQuestion {
  // Pull from dynamic high-quality templates depending on difficulty and topic
  const baseQuestion = {
    id: `AI-DRILL-${Date.now()}`,
    difficulty,
    topic,
    examId,
    text: `[Tutor Drill - ${difficulty}] ข้อใดแสดงถึงแนวคิดการแก้โจทย์ที่ดีที่สุดของหัวข้อ ${topic}?`,
    options: [
      "ยึดมั่นในระเบียบที่ถูกต้องตามขั้นตอนวิชาการและแนวทางปฏิบัติวิชาชีพอย่างสมเหตุสมผล",
      "เน้นความว่องไวสูงสุดโดยละทิ้งการตรวจสอบความขัดแย้งของตัวเลือก",
      "ใช้โชคนำทางและตอบเลือกข้อที่สั้นที่สุดเพื่อรักษาเวลาสอบ",
      "เลี่ยงการหาจุดถูกจริงและปล่อยว่างไว้เพื่อประหยัดพลังงานสมอง"
    ],
    answer: 0,
    correctExplanation: `ประสิทธิผลระดับ Staff เผยว่า การยึดจรรยาบรรณวิชาการควบคู่กับการหาทางออกที่เป็นจริงคือคำตอบที่ถูกต้องตามหลักสูตรจำลองสอบสากลครับ`,
    wrongExplanation: `การตอบโดยขาดรายละเอียดการตรวจสอบระเบียบวินัย หรือพึ่งพาดวงมีค่าเสี่ยงตอบผิดสูงถึง 75%`,
    mindset: `เมื่อต้องเผชิญหน้ากับโจทย์แนวนี้ ให้เลือกตัวเลือกที่รักษาความถูกต้องเชิงระบบและสร้างสรรค์เป็นลำดับถัดไป`,
    speedHack: `ตัดช้อยส์ที่ทุจริต ละเลย หรือโยนความรับผิดชอบออกไปทันทีก่อนพิจารณาขั้นตอนเด็ดพรีเมียม`,
  };

  // Specific Easy templates
  if (difficulty === "Easy") {
    baseQuestion.text = `[AI Easy Concept] In a clinical pharmacy context, a regular patient requests a sleeping pill without presenting a prescription.<br><br><b>Pharmacist Assistant:</b> "He is a very wealthy donor. Should we make an exception?"<br><b>You:</b> "______________________."`;
    baseQuestion.options = [
      "Certainly, donors must receive top hospitality. Get the pills immediately.",
      "I understand he supports us, but dispensing controlled drugs without a valid prescription is illegal and dangerous. We must politely refuse and suggest he sees our on-duty clinic physician.",
      "Just ignore the rule this once, but charge him double price for safety.",
      "Refuse aggressively and tell him to leave the premises immediately."
    ];
    baseQuestion.answer = 1;
    baseQuestion.correctExplanation = `ตอบข้อ 2 การรักษาความปลอดภัยของผู้รับบริการ (Patient safety) ควบคู่กับการประพฤติตามกฎหมายเภสัชกรรมอย่างสุภาพและเสนอทางออกที่เป็นระบบ (suggest clinic physician) คือจุดสมบูรณ์ที่สุดของคะแนน TGAT`;
  }

  // Specific Elite templates
  if (difficulty === "Elite") {
    if (examId === "tgat2") {
      baseQuestion.text = `[AI Elite Math Logic] ความสัมพันธ์ของตัวเลขเป็นดังนี้: 1, 4, 10, 22, 46, ... จำนวนถัดไปในอนุกรมควรเป็นจำนวนใด?`;
      baseQuestion.options = [
        "90",
        "92",
        "94",
        "96"
      ];
      baseQuestion.answer = 2;
      baseQuestion.correctExplanation = `ตอบข้อ 3 อนุกรมนี้มีกลไกความสัมพันธ์สองมิติ: เพิ่มโดยการคูณ 2 แล้วบวก 2 เข้าไป (x2 + 2) จากจำนวนก่อนหน้า:<br>• 1 * 2 + 2 = 4<br>• 4 * 2 + 2 = 10<br>• 10 * 2 + 2 = 22<br>• 22 * 2 + 2 = 46<br>• 46 * 2 + 2 = 94 จำนวนถัดไปจึงเป็น 94`;
      baseQuestion.speedHack = `มองหาอัตราส่วนการเติบโตแบบก้าวกระโดดใกล้เคียงการคูณสอง (Doubling trend). อนุกรมที่โตใกล้เคียงคูณสองมักใช้สูตร (n * 2) +- ค่าคงที่ เพื่อแก้อย่างรวดเร็วใน 5 วินาที!`;
    } else {
      baseQuestion.text = `[AI Elite Competency] ในระหว่างการประชุมนำเสนอผลการวิจัยยาใหม่ ทีมงานฝ่ายผลิตเกิดข้อขัดแย้งรุนแรงเกี่ยวกับความล่าช้าในการสกัดตัวทำละลายกับหัวหน้าทีมวิจัยจนงานล่าช้ากว่ากำหนด 1 สัปดาห์ ในฐานะที่คุณเป็นผู้จัดการโรงงาน ยุทธศาสตร์การแก้เกมใดพรีเมียมที่สุด?`;
      baseQuestion.options = [
        "สั่งลงโทษหัวหน้าทีมวิจัยกะทันหันเพื่อสร้างอำนาจควบคุมความมีระเบียบขององค์กร",
        "จัดกลุ่มประชุมพิเศษแบบไตรภาคีเพื่อจัดโครงสร้างตารางงานใหม่ ปันส่วนหน้าที่อย่างเจาะจง และมุ่งหาแนวทางการสกัดตัวทำละลายทางเลือกโดยไม่หาคนรับผิดชอบอดีต",
        "ละเว้นไม่เข้าร่วมกระบวนการและปล่อยให้ทั้งสองทีมขัดแย้งกันต่อไปจนกว่าจะมีฝ่ายยอมแพ้",
        "ยกเลิกโครงการวิจัยยาดังกล่าวทั้งหมดเพื่อสกัดกั้นการสูญเสียเงินทุนสะสม"
      ];
      baseQuestion.answer = 1;
      baseQuestion.correctExplanation = `ตอบข้อ 2 การจัดเวทีแก้ปัญหาร่วมกัน (Collaborative problem solving) โดยเน้นระบบงานเป็นศูนย์กลาง ไม่หาคนผิด (No-blame culture) และปันส่วนภาระหน้าที่ประนีประนอมคือทักษะผู้นำอนาคตที่ได้คะแนน TGAT สูงสุด`;
      baseQuestion.speedHack = `ช้อยส์ที่ยุติธรรม ปลอดภัย สร้างความสัมพันธ์เชิงบวก ทำความเข้าใจปัญหา และเสนอทางปฏิบัติที่เป็นจริง (actionable steps) มักเป็นตัวเลือกอันดับหนึ่งเสมอ`;
    }
  }

  return baseQuestion;
}
