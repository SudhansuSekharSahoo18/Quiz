export interface QuizOption {
  id: string; // Unique ID for the option
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string; // Unique ID for the question
  questionText: string;
  options: QuizOption[];
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
}
