import type { Question, SearchFilters } from "@/types/exam";

export function searchQuestions(
  questions: Question[],
  filters: SearchFilters
): Question[] {
  return questions.filter(q => {
    // Exact match filters
    if (filters.topic && q.topic !== filters.topic) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters.section && q.section !== filters.section) return false;
    if (filters.frequency && q.frequency !== filters.frequency) return false;
    
    // Type-specific filters
    if (filters.competency && "competency" in q && q.competency !== filters.competency) return false;

    // Keyword text search (case-insensitive)
    if (filters.keyword) {
      const keywordLower = filters.keyword.toLowerCase();
      const inText = q.text.toLowerCase().includes(keywordLower);
      const inPassage = q.passage?.toLowerCase().includes(keywordLower);
      const inOptions = q.options.some(opt => opt.toLowerCase().includes(keywordLower));
      
      if (!inText && !inPassage && !inOptions) return false;
    }

    return true;
  });
}

export function getUniqueTopics(questions: Question[]): string[] {
  const topics = new Set<string>();
  questions.forEach(q => topics.add(q.topic));
  return Array.from(topics).sort();
}

export function getUniqueSections(questions: Question[]): string[] {
  const sections = new Set<string>();
  questions.forEach(q => sections.add(q.section));
  return Array.from(sections).sort();
}
