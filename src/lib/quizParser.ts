import type { QuizData, QuizQuestion, QuizOption } from '@/types';
import { nanoid } from 'nanoid'; // For generating unique IDs if not present

// Basic validation for the structure of QuizData
function isValidQuizData(data: any): data is QuizData {
  if (typeof data !== 'object' || data === null) return false;
  if (typeof data.title !== 'string') return false;
  if (!Array.isArray(data.questions)) return false;

  return data.questions.every((q: any) => {
    if (typeof q !== 'object' || q === null) return false;
    if (typeof q.questionText !== 'string') return false;
    if (!Array.isArray(q.options)) return false;
    if (q.options.length === 0) return false; // Must have options
    if (q.category && typeof q.category !== 'string') return false;
    if (q.explanation && typeof q.explanation !== 'string') return false;
    
    let hasCorrectOption = false;
    const optionTexts = new Set<string>();

    const isValid = q.options.every((opt: any) => {
      if (typeof opt !== 'object' || opt === null) return false;
      if (typeof opt.text !== 'string') return false;
      if (typeof opt.isCorrect !== 'boolean') return false;
      if (opt.isCorrect) hasCorrectOption = true;
      if(optionTexts.has(opt.text)) return false; // No duplicate option texts
      optionTexts.add(opt.text);
      return true;
    });
    return isValid && hasCorrectOption; // Each question must have at least one correct option
  });
}

export function parseJsonQuiz(jsonString: string): QuizData | null {
  try {
    const data = JSON.parse(jsonString);
    if (!isValidQuizData(data)) {
      console.error("Invalid quiz data structure.");
      return null;
    }
    
    // Ensure IDs are present for questions and options
    const validatedQuestions = data.questions.map((q: QuizQuestion) => ({
      ...q,
      id: q.id || nanoid(),
      options: q.options.map((opt: QuizOption) => ({
        ...opt,
        id: opt.id || nanoid(),
      })),
    }));

    return { ...data, questions: validatedQuestions };

  } catch (error) {
    console.error("Failed to parse JSON quiz data:", error);
    return null;
  }
}

// Placeholder for text file parsing logic if needed in the future
export function parseTextQuiz(textString: string): QuizData | null {
  // This is a complex task. For now, we'll just log a message.
  // A simple format could be:
  // Question
  // Option A
  // Option B (Correct)
  // Option C
  // ---
  console.warn("Text quiz parsing is not yet implemented. Please use JSON format.");
  return null; 
}
