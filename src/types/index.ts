
export interface QuizOption {
  id: string; // Unique ID for the option
  text: string;
  isCorrect: boolean;
}

export type QuestionType = 'multiple-choice' | 'subjective';

export interface QuizQuestion {
  id: string; // Unique ID for the question
  questionText: string;
  questionType: QuestionType;
  options: QuizOption[]; // Empty for subjective questions if not applicable for display
  referenceAnswer?: string; // Required for subjective questions for AI grading
  category?: string;
  explanation?: string;
}

export interface QuizData {
  title: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  quizTitle: string;
  attemptedQuestions: number;
  skippedQuestions: number;
}

