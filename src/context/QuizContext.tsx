
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { QuizData, QuizResult } from '@/types';

interface QuizContextType {
  quizData: QuizData | null;
  setQuizData: (data: QuizData | null) => void;
  quizResult: QuizResult | null;
  setQuizResult: (result: QuizResult | null) => void;
  clearQuiz: () => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const clearQuiz = useCallback(() => {
    setQuizData(null);
    setQuizResult(null);
  }, [setQuizData, setQuizResult]); // setQuizData & setQuizResult from useState are stable
  
  const contextValue = useMemo(() => ({
    quizData,
    setQuizData, // Direct setter from useState is stable
    quizResult,
    setQuizResult, // Direct setter from useState is stable
    clearQuiz, // Now stable from useCallback
  }), [quizData, quizResult, clearQuiz, setQuizData, setQuizResult]);

  return (
    <QuizContext.Provider value={contextValue}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
}

