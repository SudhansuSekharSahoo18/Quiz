
"use client";

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { QuizData, QuizResult } from '@/types';

const SPEAKER_ENABLED_LS_KEY = 'quizWhizSpeakerEnabled';
const AUTO_ADVANCE_ENABLED_LS_KEY = 'quizWhizAutoAdvanceEnabled';
const AUTO_MIC_ENABLED_LS_KEY = 'quizWhizAutoMicEnabled';

interface QuizContextType {
  quizData: QuizData | null;
  setQuizData: (data: QuizData | null) => void;
  quizResult: QuizResult | null;
  setQuizResult: (result: QuizResult | null) => void;
  clearQuiz: () => void;
  isSpeakerEnabled: boolean;
  setIsSpeakerEnabled: (enabled: boolean) => void;
  isAutoAdvanceEnabled: boolean;
  setIsAutoAdvanceEnabled: (enabled: boolean) => void;
  isAutoMicEnabled: boolean;
  setIsAutoMicEnabled: (enabled: boolean) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  
  const [isSpeakerEnabled, setIsSpeakerEnabledState] = useState<boolean>(true);
  const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabledState] = useState<boolean>(true);
  const [isAutoMicEnabled, setIsAutoMicEnabledState] = useState<boolean>(false); // Default to false

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSpeakerValue = localStorage.getItem(SPEAKER_ENABLED_LS_KEY);
      setIsSpeakerEnabledState(storedSpeakerValue ? JSON.parse(storedSpeakerValue) : true);

      const storedAutoAdvanceValue = localStorage.getItem(AUTO_ADVANCE_ENABLED_LS_KEY);
      setIsAutoAdvanceEnabledState(storedAutoAdvanceValue ? JSON.parse(storedAutoAdvanceValue) : true);

      const storedAutoMicValue = localStorage.getItem(AUTO_MIC_ENABLED_LS_KEY);
      setIsAutoMicEnabledState(storedAutoMicValue ? JSON.parse(storedAutoMicValue) : false);
    }
  }, []);

  const setIsSpeakerEnabled = useCallback((enabled: boolean) => {
    setIsSpeakerEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SPEAKER_ENABLED_LS_KEY, JSON.stringify(enabled));
    }
  }, []);

  const setIsAutoAdvanceEnabled = useCallback((enabled: boolean) => {
    setIsAutoAdvanceEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_ADVANCE_ENABLED_LS_KEY, JSON.stringify(enabled));
    }
  }, []);

  const setIsAutoMicEnabled = useCallback((enabled: boolean) => {
    setIsAutoMicEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_MIC_ENABLED_LS_KEY, JSON.stringify(enabled));
    }
  }, []);

  const clearQuiz = useCallback(() => {
    setQuizData(null);
    setQuizResult(null);
  }, []);
  
  const contextValue = useMemo(() => ({
    quizData,
    setQuizData,
    quizResult,
    setQuizResult,
    clearQuiz,
    isSpeakerEnabled,
    setIsSpeakerEnabled,
    isAutoAdvanceEnabled,
    setIsAutoAdvanceEnabled,
    isAutoMicEnabled,
    setIsAutoMicEnabled,
  }), [
    quizData, quizResult, clearQuiz, 
    isSpeakerEnabled, setIsSpeakerEnabled, 
    isAutoAdvanceEnabled, setIsAutoAdvanceEnabled,
    isAutoMicEnabled, setIsAutoMicEnabled
  ]);

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
