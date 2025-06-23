
import type { QuizData, QuizQuestion, QuizOption, QuestionType } from '@/types';
import { nanoid } from 'nanoid'; // For generating unique IDs if not present

// Basic validation for the structure of QuizData
function isValidQuizData(data: any): data is QuizData {
  if (typeof data !== 'object' || data === null) return false;
  if (typeof data.title !== 'string') return false;
  if (!Array.isArray(data.questions)) return false;

  return data.questions.every((q: any) => {
    if (typeof q !== 'object' || q === null) return false;
    if (typeof q.questionText !== 'string') return false;
    
    const questionType: QuestionType = q.questionType || 'multiple-choice';
    if (!['multiple-choice', 'subjective'].includes(questionType)) return false;

    if (q.category && typeof q.category !== 'string') return false;
    if (q.explanation && typeof q.explanation !== 'string') return false;

    if (questionType === 'multiple-choice') {
      if (!Array.isArray(q.options)) return false;
      if (q.options.length === 0) return false; // Must have options for multiple-choice
      let hasCorrectOption = false;
      const optionTexts = new Set<string>();
      const isValidOptions = q.options.every((opt: any) => {
        if (typeof opt !== 'object' || opt === null) return false;
        if (typeof opt.text !== 'string') return false;
        if (typeof opt.isCorrect !== 'boolean') return false;
        if (opt.isCorrect) hasCorrectOption = true;
        if (optionTexts.has(opt.text)) return false; // No duplicate option texts
        optionTexts.add(opt.text);
        return true;
      });
      if (!isValidOptions || !hasCorrectOption) return false;
    } else if (questionType === 'subjective') {
      if (typeof q.referenceAnswer !== 'string' || q.referenceAnswer.trim() === '') return false; // Must have reference answer for subjective
      // Options array can be empty or missing for subjective, or not validated strictly if present
      if (q.options && !Array.isArray(q.options)) return false;
    }
    return true;
  });
}

export function parseJsonQuiz(jsonString: string): QuizData | null {
  try {
    const data = JSON.parse(jsonString);
    if (!isValidQuizData(data)) {
      console.error("Invalid quiz data structure or content.");
      return null;
    }
    
    // Ensure IDs and default questionType are present
    const validatedQuestions = data.questions.map((q: QuizQuestion) => ({
      ...q,
      id: q.id || nanoid(),
      questionType: q.questionType || 'multiple-choice',
      options: q.questionType === 'subjective' 
                 ? (q.options || []) // Allow empty options for subjective, ensure it's an array
                 : (q.options || []).map((opt: QuizOption) => ({ // Process options for non-subjective
                      ...opt,
                      id: opt.id || nanoid(),
                    })),
      referenceAnswer: q.questionType === 'subjective' ? q.referenceAnswer : undefined,
    }));

    return { ...data, questions: validatedQuestions };

  } catch (error) {
    console.error("Failed to parse JSON quiz data:", error);
    return null;
  }
}

// Placeholder for text file parsing logic if needed in the future
export function parseTextQuiz(textString: string): QuizData | null {
  console.warn("Text quiz parsing is not yet implemented. Please use JSON format.");
  return null; 
}
