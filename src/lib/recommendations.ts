export function getStudyRecommendations(weakTopics: string[]): string[] {
  const recommendations: string[] = [];
  
  if (weakTopics.includes("Logical Reasoning")) {
    recommendations.push("ทบทวนเรื่องการอ้างเหตุผลและการหาข้อสรุปที่สมเหตุสมผล");
  }
  if (weakTopics.includes("Spatial Reasoning")) {
    recommendations.push("ฝึกมองภาพ 3 มิติ การหมุน และการพับกล่อง");
  }
  if (weakTopics.includes("Conversation & Dialogue")) {
    recommendations.push("ฝึกจับใจความจากบริบทสถานการณ์ (Setting) และผู้พูด (Roles)");
  }
  if (weakTopics.includes("Emotional Intelligence")) {
    recommendations.push("เน้นการตอบโดยใช้หลัก Empathy (เห็นใจ) และ Win-Win situation");
  }

  // Fallback
  if (recommendations.length === 0) {
    recommendations.push("ทำโจทย์สม่ำเสมอ จับเวลาเหมือนจริงเพื่อเพิ่มความเร็ว");
  }

  return recommendations;
}

export function getPriorityTopics(weakTopics: string[], frequencyMap: Record<string, string>): string[] {
  // Sort weak topics by frequency (Very High -> Low)
  return weakTopics.sort((a, b) => {
    const fA = frequencyMap[a] || "Low";
    const fB = frequencyMap[b] || "Low";
    const weight = { "Very High": 4, "High": 3, "Medium": 2, "Low": 1 };
    return (weight[fB as keyof typeof weight] || 0) - (weight[fA as keyof typeof weight] || 0);
  });
}
