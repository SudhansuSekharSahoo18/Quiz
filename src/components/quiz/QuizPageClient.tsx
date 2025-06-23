
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { QuizQuestion, QuizOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, ChevronLeft, RotateCcw, Volume2, Mic, MicOff, Loader2, TimerIcon, Send, LogOut, MessageSquareText } from 'lucide-react';
import { AppLogo } from '@/components/common/AppLogo';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { submitSubjectiveAnswer as submitSubjectiveAnswerAction } from '@/lib/actions';

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex?: number; 
}

const AUTO_ADVANCE_DELAY = 3000;
const NO_SPEECH_TIMEOUT_DURATION = 10000;

interface UserAnswerState {
  selectedOptionId: string | null;
  subjectiveAnswer: string;
  isCorrect: boolean | null;
  feedbackText: string | null;
  feedbackShown: boolean;
}

const initialUserAnswerState: UserAnswerState = {
  selectedOptionId: null,
  subjectiveAnswer: '',
  isCorrect: null,
  feedbackText: null,
  feedbackShown: false,
};

export function QuizPageClient() {
  const router = useRouter();
  const { quizData, setQuizResult, clearQuiz, isSpeakerEnabled, isAutoAdvanceEnabled, isAutoMicEnabled } = useQuiz();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswerState[]>([]);

  const [subjectiveAnswer, setSubjectiveAnswer] = useState('');
  const [isSubmittingSubjective, setIsSubmittingSubjective] = useState(false);

  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);


  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoMicAttemptedForQuestionRef = useRef<string | null>(null);
  const [micWasAutoStarted, setMicWasAutoStarted] = useState(false);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');


  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeftForAutoAdvance, setTimeLeftForAutoAdvance] = useState(0);

  const currentQuestion: QuizQuestion | undefined = useMemo(() =>
    quizData?.questions[currentQuestionIndex],
    [quizData, currentQuestionIndex]
  );

  const showFeedbackRef = useRef(showFeedback);
  const handleOptionSelectRef = useRef<(option: QuizOption) => void>(() => {});

  // Define callbacks early to satisfy dependency arrays of later useEffects
  const handleCancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setTimeLeftForAutoAdvance(0);
  }, []);

  const handleReadAloud = useCallback((text: string) => {
    if (!isSpeakerEnabled || !text) {
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Feature Not Supported",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
    }
  }, [isSpeakerEnabled, toast]);

  const completeQuizAndNavigateToResults = useCallback(() => {
    handleCancelAutoAdvance();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* Already stopped */ }
    }

    if (!quizData) return;

    let finalScore = 0;
    let attemptedCount = 0;
    userAnswers.forEach(ua => {
        if (ua.isCorrect) {
            finalScore++;
        }
        if (ua.feedbackShown) {
            attemptedCount++;
        }
    });
    const skippedCount = quizData.questions.length - attemptedCount;

    setQuizResult({
        score: finalScore,
        totalQuestions: quizData.questions.length,
        quizTitle: quizData.title,
        attemptedQuestions: attemptedCount,
        skippedQuestions: skippedCount,
    });
    router.push('/results');
  }, [quizData, userAnswers, setQuizResult, router, handleCancelAutoAdvance, isListening]);


  const processAnswerSubmission = useCallback((correct: boolean | null, aiFeedback?: string) => {
    const currentAttemptResult: UserAnswerState = {
      selectedOptionId: currentQuestion?.questionType === 'multiple-choice' ? selectedOptionId : null,
      subjectiveAnswer: currentQuestion?.questionType === 'subjective' ? subjectiveAnswer : '',
      isCorrect: correct,
      feedbackText: aiFeedback || (correct === false && currentQuestion?.explanation ? currentQuestion.explanation : null) || null,
      feedbackShown: true,
    };

    const updatedUserAnswers = userAnswers.map((ans, index) =>
      index === currentQuestionIndex ? currentAttemptResult : ans
    );
    setUserAnswers(updatedUserAnswers);

    setIsAnswerCorrect(correct);
    setFeedbackText(currentAttemptResult.feedbackText);
    setShowFeedback(true);

    if (isSpeakerEnabled && correct === false) {
      let textToRead = "";
      if (currentAttemptResult.feedbackText) {
        textToRead = currentAttemptResult.feedbackText;
      } else if (currentQuestion?.explanation) {
        textToRead = currentQuestion.explanation;
      }

      if (currentQuestion?.questionType === 'subjective' && currentQuestion.referenceAnswer && correct === false) {
        textToRead += (textToRead ? " " : "") + "The model answer is: " + currentQuestion.referenceAnswer;
      }

      if (textToRead) {
        handleReadAloud(textToRead);
      }
    }

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {/* Already stopped or not active */ }
    }

    const isLastQuestion = quizData ? currentQuestionIndex === quizData.questions.length - 1 : true;
    if (!isLastQuestion && isAutoAdvanceEnabled) {
      setTimeLeftForAutoAdvance(AUTO_ADVANCE_DELAY);
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        if(quizData && currentQuestionIndex < quizData.questions.length -1) {
             setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
        } else if (quizData && currentQuestionIndex === quizData.questions.length -1) {
            completeQuizAndNavigateToResults();
        }
      }, AUTO_ADVANCE_DELAY);
    } else {
      setTimeLeftForAutoAdvance(0);
    }
  }, [
    currentQuestion, selectedOptionId, subjectiveAnswer, userAnswers, currentQuestionIndex,
    isSpeakerEnabled, handleReadAloud, isListening, quizData, isAutoAdvanceEnabled, completeQuizAndNavigateToResults
  ]);

  const handleOptionSelect = useCallback((option: QuizOption) => {
    if (showFeedbackRef.current) return;
    setSelectedOptionId(option.id);
    processAnswerSubmission(option.isCorrect);
  }, [processAnswerSubmission]);

  useEffect(() => {
    showFeedbackRef.current = showFeedback;
  }, [showFeedback]);

  useEffect(() => {
    handleOptionSelectRef.current = handleOptionSelect;
  }, [handleOptionSelect]);


  const score = useMemo(() => {
    return userAnswers.reduce((acc, answer) => acc + (answer.isCorrect ? 1 : 0), 0);
  }, [userAnswers]);

  const loadQuestionState = useCallback((index: number) => {
    if (userAnswers[index]) {
      const attempt = userAnswers[index];
      setSelectedOptionId(attempt.selectedOptionId);
      setSubjectiveAnswer(attempt.subjectiveAnswer);
      setIsAnswerCorrect(attempt.isCorrect);
      setFeedbackText(attempt.feedbackText);
      setShowFeedback(attempt.feedbackShown);
    } else {
      setSelectedOptionId(null);
      setSubjectiveAnswer('');
      setIsAnswerCorrect(null);
      setFeedbackText(null);
      setShowFeedback(false);
    }
    setSpeechError(null);
    setIsSubmittingSubjective(false);
    autoMicAttemptedForQuestionRef.current = null;
    setLiveTranscript(''); // Clear transcript display for new question

    if (recognitionRef.current && isListening) { // Stop active mic if navigating
        try {
            recognitionRef.current.stop();
        } catch (e) { /* Already stopped or not active */ }
    }
    handleCancelAutoAdvance(); // Always cancel auto-advance when loading new state
    if ('speechSynthesis' in window) { // Cancel any ongoing speech
      window.speechSynthesis.cancel();
    }
  }, [userAnswers, handleCancelAutoAdvance]); // Removed isListening from here

  useEffect(() => {
    if (quizData && quizData.questions.length > 0) {
      if (userAnswers.length === 0 || userAnswers.length !== quizData.questions.length) {
         setUserAnswers(quizData.questions.map(() => ({ ...initialUserAnswerState })));
      }
      if (currentQuestionIndex < (userAnswers.length || quizData.questions.length)) {
        loadQuestionState(currentQuestionIndex);
      }
    } else if (!quizData && router) {
      // Only redirect if quizData is definitively null and not just loading
      // This can be tricky if quizData starts as null then loads.
      // A more robust check might involve a separate loading state for quizData itself.
      router.replace('/');
    }
  }, [quizData, currentQuestionIndex, userAnswers.length, loadQuestionState, router]);

  const handleNextQuestion = useCallback(() => {
    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      completeQuizAndNavigateToResults();
    }
  }, [quizData, currentQuestionIndex, completeQuizAndNavigateToResults]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      handleCancelAutoAdvance();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setCurrentQuestionIndex((prevIndex) => prevIndex - 1);
    }
  }, [currentQuestionIndex, handleCancelAutoAdvance]);

  const handleSubjectiveSubmit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (showFeedbackRef.current || !currentQuestion || currentQuestion.questionType !== 'subjective') return;

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {/* Already stopped or not active */ }
    }

    if (subjectiveAnswer.trim() === "") {
      processAnswerSubmission(false, "The answer was left blank. Please provide an answer.");
      return;
    }

    if (!currentQuestion.referenceAnswer) {
        processAnswerSubmission(false, "This question cannot be graded as a model answer is missing.");
        return;
    }

    setIsSubmittingSubjective(true);

    try {
        const result = await submitSubjectiveAnswerAction({
          questionText: currentQuestion.questionText,
          userAnswer: subjectiveAnswer,
          referenceAnswer: currentQuestion.referenceAnswer,
        });

        if ('error'in result) {
            processAnswerSubmission(false, result.error || "The AI grading service experienced an issue. Your answer could not be graded at this time. Please proceed to the next question.");
            toast({ title: "Grading Issue", description: result.error, variant: "destructive" });
        } else {
            processAnswerSubmission(result.isCorrect, result.feedback);
        }
    } catch (e) {
        const errorMessage = "An unexpected error occurred while submitting your answer. Please try again or skip the question.";
        processAnswerSubmission(false, errorMessage);
        toast({ title: "Submission Error", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSubmittingSubjective(false);
    }
  }, [
    currentQuestion, subjectiveAnswer, toast, isListening,
    processAnswerSubmission,
  ]);

  const toggleListening = useCallback(() => {
    if (!hasSpeechSupport || !recognitionRef.current) {
        toast({
            title: "Speech Recognition Not Available",
            description: "Cannot start microphone. This feature may not be supported by your browser.",
            variant: "destructive"
        });
      return;
    }
    const currentRecognition = recognitionRef.current;

    if (isListening) {
      try {
        currentRecognition.stop();
        // Actual state changes (isListening = false) handled by onend
      } catch (e) {
        console.warn("Error stopping recognition:", e);
      }
    } else {
      setMicWasAutoStarted(false); // Explicitly mark as manual start
      try {
        currentRecognition.start();
        // Actual state changes (isListening = true) handled by onstart
      } catch (error: any) {
        const errorMessage = error.message || error.name || 'Unknown error';
        setSpeechError(`Could not start microphone. Error: ${errorMessage}`);
        if (!(error && error.name === 'InvalidStateError' && (error.message?.includes('recognition has already started') || error.message?.includes('already started')))) {
          toast({
              title: "Microphone Error",
              description: `Could not start microphone. ${errorMessage}. Please check permissions.`,
              variant: "destructive"
          });
        }
      }
    }
  }, [hasSpeechSupport, isListening, toast]); // Removed setMicWasAutoStarted from deps, it's set internally


  const handleEndQuiz = useCallback(() => {
    completeQuizAndNavigateToResults();
  }, [completeQuizAndNavigateToResults]);


  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setHasSpeechSupport(false);
      recognitionRef.current = null;
      return;
    }

    setHasSpeechSupport(true);
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true; // Enable interim results for live transcript
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
      setLiveTranscript(''); // Clear display transcript
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const currentShowFeedback = showFeedbackRef.current;
      const currentHandleOptionSelect = handleOptionSelectRef.current;
      const questionForThisRecognition = quizData?.questions[currentQuestionIndex];

      let combinedTranscriptForDisplay = "";
      for (let i = 0; i < event.results.length; ++i) {
        combinedTranscriptForDisplay += event.results[i][0].transcript;
      }
      setLiveTranscript(combinedTranscriptForDisplay); // Update live transcript for display

      // Process only if the last segment is final
      if (event.results.length > 0 && event.results[event.results.length - 1].isFinal) {
        let finalUtteranceForProcessing = "";
        for (let i = 0; i < event.results.length; ++i) {
            finalUtteranceForProcessing += event.results[i][0].transcript;
        }
        const processedFinalText = finalUtteranceForProcessing.trim();

        if (!processedFinalText) return;

        if (!questionForThisRecognition || currentShowFeedback) {
          return;
        }

        if (noSpeechTimeoutRef.current) {
          clearTimeout(noSpeechTimeoutRef.current);
          noSpeechTimeoutRef.current = null;
        }
        // Don't setMicWasAutoStarted(false) here, let onend handle it broadly.

        if (questionForThisRecognition.questionType === 'subjective') {
          setSubjectiveAnswer(prev => {
            const currentText = prev.trim();
            if (currentText) {
              return currentText + " " + processedFinalText;
            }
            return processedFinalText;
          });
          // No explicit stop() here, rely on continuous=false
        } else if (questionForThisRecognition.questionType === 'multiple-choice') {
          const initialProcessedTranscriptForMC = processedFinalText.toLowerCase().replace(/[.,!?;:"']/g, '');
          const numberWordsToDigits: { [key: string]: string } = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
          };
          const words = initialProcessedTranscriptForMC.split(' ');
          const convertedWords = words.map(word => numberWordsToDigits[word] || word);
          const digitizedTranscript = convertedWords.join(' ');

          let foundOption: QuizOption | undefined = undefined;
          const qOptions = questionForThisRecognition.options;

          const attemptMatch = (transcript: string): QuizOption | undefined => {
              let optionMatch: QuizOption | undefined;
              optionMatch = qOptions.find(
                  opt => opt.text.trim().toLowerCase() === transcript.trim().toLowerCase()
              );
              if (!optionMatch) {
                  const transcriptTokens = transcript.split(' ');
                  if (transcriptTokens.length === 1) {
                      const singleToken = transcriptTokens[0];
                      optionMatch = qOptions.find(opt => {
                          const optText = opt.text.trim().toLowerCase();
                          if (optText === singleToken) return true;
                          if (optText.startsWith(singleToken) &&
                              (optText.length === singleToken.length || (optText.length > singleToken.length && !/\w/.test(optText[singleToken.length])))) {
                               return true;
                          }
                          return false;
                      });
                  }
              }
              return optionMatch;
          };

          foundOption = attemptMatch(digitizedTranscript);
          if (!foundOption && digitizedTranscript !== initialProcessedTranscriptForMC) {
              foundOption = attemptMatch(initialProcessedTranscriptForMC);
          }

          if (foundOption) {
            currentHandleOptionSelect(foundOption);
          } else {
            let debugMessage = `(Processed: "${initialProcessedTranscriptForMC}"`;
            if (digitizedTranscript !== initialProcessedTranscriptForMC) {
                debugMessage += `, Digitized: "${digitizedTranscript}"`;
            }
            debugMessage += ")";
            const errorMessage = `Could not match: "${processedFinalText}". Please try again or select manually. ${debugMessage}`;
            setSpeechError(errorMessage);
            toast({
              title: "No Match Found",
              description: `"${processedFinalText}" did not match an option. ${debugMessage}`,
              variant: "destructive"
            });
          }
        }
      }
    };


    recognition.onerror = (event: any) => {
      // `onend` will also be called, which handles state cleanup.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast({
            title: "Speech Error",
            description: `Error: ${event.error}`,
            variant: "destructive"
        });
      }
      setSpeechError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      setMicWasAutoStarted(false); // Always reset this on session end
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
    };

    return () => {
      if (recognitionRef.current === recognition) {
        try {
          recognition.abort(); // Use abort for immediate stop on unmount
        } catch(e) { /* Already aborted or not active */ }
      }
    };
  }, [quizData, currentQuestionIndex, toast]); // Dependencies for re-creating recognition instance


  useEffect(() => {
    if (currentQuestion && isSpeakerEnabled && !showFeedbackRef.current) {
      handleReadAloud(currentQuestion.questionText);
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion?.id, isSpeakerEnabled, handleReadAloud]);


  useEffect(() => {
    let micTimeoutId: NodeJS.Timeout | null = null;
    // Check if we should attempt to auto-start mic for the current question
    if (
      isAutoMicEnabled &&
      hasSpeechSupport &&
      currentQuestion &&
      !showFeedback &&
      !isSubmittingSubjective &&
      !isListening && // Only if not already listening
      autoMicAttemptedForQuestionRef.current !== currentQuestion.id // And not already attempted for this question
    ) {
      // Mark attempt immediately before setTimeout
      autoMicAttemptedForQuestionRef.current = currentQuestion.id;

      micTimeoutId = setTimeout(() => {
        // Re-check conditions inside timeout, as state might have changed
        if (
          currentQuestion?.id === quizData?.questions[currentQuestionIndex]?.id &&
          !isListening && // Check again, user might have manually started
          isAutoMicEnabled &&
          hasSpeechSupport &&
          !showFeedback &&
          !isSubmittingSubjective
        ) {
          setMicWasAutoStarted(true); // Signal that this session will be auto-started
          toggleListening(); // Attempt to start
        } else {
          // If conditions changed, reset the attempt flag for this question
          // This path is less likely now with the pre-timeout flag set, but good for safety
           if(autoMicAttemptedForQuestionRef.current === currentQuestion.id) {
             // autoMicAttemptedForQuestionRef.current = null; // Or just let it be, next question will clear
           }
        }
      }, 300); // Short delay
    }
    return () => {
      if (micTimeoutId) clearTimeout(micTimeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentQuestion, // This covers currentQuestion.id implicitly
    isAutoMicEnabled,
    hasSpeechSupport,
    showFeedback,
    isSubmittingSubjective,
    isListening,
    quizData, // For quizData?.questions access inside setTimeout
    currentQuestionIndex // For quizData?.questions access inside setTimeout
    // autoMicAttemptedForQuestionRef is a ref, not a dep
    // toggleListening is a dep but ESLint should handle it or we use eslint-disable
  ]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showFeedback && timeLeftForAutoAdvance > 0 && isAutoAdvanceEnabled && quizData && (currentQuestionIndex < quizData.questions.length - 1) ) {
      interval = setInterval(() => {
        setTimeLeftForAutoAdvance(prev => Math.max(0, prev - 100));
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeftForAutoAdvance, showFeedback, isAutoAdvanceEnabled, quizData, currentQuestionIndex]);

  useEffect(() => {
    // This effect manages the 10-second timeout for auto-started mic
    if (isListening && micWasAutoStarted) {
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current && isListening && micWasAutoStarted) { // Check all conditions again
          try {
            recognitionRef.current.stop(); // This will trigger onend
          } catch (e) { /* Error stopping */ }
        }
      }, NO_SPEECH_TIMEOUT_DURATION);
    } else {
      // If not listening or not an auto-started session, ensure timeout is cleared
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
    }

    return () => {
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
    };
  }, [isListening, micWasAutoStarted]);


  useEffect(() => {
    // General cleanup on unmount
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
       if (noSpeechTimeoutRef.current) { // Ensure this is also cleared on unmount
        clearTimeout(noSpeechTimeoutRef.current);
      }
      // SpeechRecognition instance cleanup is handled by its own useEffect's return
    };
  }, []);


  if (!quizData || !currentQuestion || userAnswers.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AppLogo className="mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-lg font-body mb-4">Loading quiz...</p>
        <Button onClick={() => router.push('/')} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" /> Go to Home
        </Button>
      </div>
    );
  }

  const progressValue = ((currentQuestionIndex + 1) / quizData.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <AppLogo className="text-3xl" />
            <div className="text-right">
              <p className="font-headline text-xl">Score: {score}/{quizData.questions.length}</p>
              <p className="text-sm text-muted-foreground font-body">Question {currentQuestionIndex + 1} of {quizData.questions.length}</p>
            </div>
          </div>
          <Progress value={progressValue} className="w-full h-2" />
          <div className="mt-4 pt-4 border-t">
            {currentQuestion.category && (
              <div className="mb-2 flex items-center text-muted-foreground">
                <CategoryIcon category={currentQuestion.category} className="mr-2 h-5 w-5" />
                <span className="font-body text-sm">{currentQuestion.category}</span>
              </div>
            )}
            <div className="flex items-start justify-between">
              <CardTitle className="font-headline text-2xl flex-grow mr-2">
                {currentQuestion.questionText}
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-center gap-1 shrink-0">
                 {isSpeakerEnabled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!isSpeakerEnabled) {
                           toast({
                            title: "Speaker Disabled",
                            description: "The read aloud feature is currently disabled in settings.",
                          });
                          return;
                        }
                        handleReadAloud(currentQuestion.questionText)
                      }}
                      aria-label="Read question aloud"
                      title="Read question aloud"
                      className="text-primary hover:text-primary/80"
                    >
                      <Volume2 className="h-6 w-6" />
                    </Button>
                 )}
                {hasSpeechSupport && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                           if (isListening) {
                                toggleListening(); // User manually stops
                           } else {
                               setMicWasAutoStarted(false); // User manually starts
                               toggleListening();
                           }
                        }}
                        aria-label={isListening ? "Stop listening" : (currentQuestion.questionType === 'subjective' ? "Dictate into answer field" : "Speak an option")}
                        title={isListening ? "Stop listening" : (currentQuestion.questionType === 'subjective' ? "Dictate into answer field" : "Speak an option")}
                        className={cn(
                            "hover:text-primary/80",
                            isListening ? "text-destructive animate-pulse" : "text-primary"
                        )}
                        disabled={showFeedback || (currentQuestion.questionType === 'subjective' && isSubmittingSubjective)}
                    >
                        {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>
                )}
              </div>
            </div>
             {isListening && liveTranscript && (
                <div className="mt-2 text-xs text-muted-foreground italic text-center px-2 py-1 border border-dashed rounded-md bg-muted/30">
                    &quot;{liveTranscript}&quot;
                </div>
            )}
             {isListening && !liveTranscript && (
                 <div className="mt-2 text-sm text-primary flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Listening...
                    {micWasAutoStarted && <span className="text-xs text-muted-foreground ml-1">(Auto)</span>}
                </div>
            )}
            {!isListening && liveTranscript && !speechError && (
                <div className="mt-2 text-xs text-muted-foreground text-center p-2 border rounded-md bg-muted/50">
                    <MessageSquareText className="inline h-4 w-4 mr-1 text-primary"/>
                    <i>Transcript: &quot;{liveTranscript}&quot;</i>
                </div>
            )}
            {speechError && (
                <Alert variant="destructive" className="mt-2 text-sm">
                    <XCircle className="h-4 w-4"/>
                    <AlertTitle>Speech Error</AlertTitle>
                    <AlertDescription>{speechError}</AlertDescription>
                </Alert>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.questionType === 'multiple-choice' && currentQuestion.options.map((option) => {
            const isActuallySelected = userAnswers[currentQuestionIndex]?.selectedOptionId === option.id;
            let buttonVariant: "outline" | "default" | "secondary" | "destructive" = "outline";

            if (showFeedback && isActuallySelected) {
              buttonVariant = isAnswerCorrect ? "secondary" : "destructive";
            } else if (showFeedback && option.isCorrect) {
              buttonVariant = "secondary";
            }

            return (
              <Button
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                variant={buttonVariant}
                className={cn(
                  "w-full justify-start text-left h-auto py-3 px-4 font-body text-base leading-normal transition-all duration-200 relative",
                  showFeedback && isActuallySelected && isAnswerCorrect === true && "bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300",
                  showFeedback && isActuallySelected && isAnswerCorrect === false && "bg-red-100 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300",
                  showFeedback && !isActuallySelected && option.isCorrect && "bg-green-50 dark:bg-green-950 border-green-300 text-green-600 dark:text-green-400",
                  showFeedback && "cursor-not-allowed opacity-80"
                )}
                disabled={showFeedback}
                aria-pressed={isActuallySelected}
              >
                <span className="flex-grow">{option.text}</span>
                 {showFeedback && isActuallySelected && (isAnswerCorrect === true ? <CheckCircle2 className="ml-2 h-5 w-5 text-green-500 shrink-0" /> : (isAnswerCorrect === false ? <XCircle className="ml-2 h-5 w-5 text-red-500 shrink-0" /> : null))}
                 {showFeedback && !isActuallySelected && option.isCorrect && <CheckCircle2 className="ml-2 h-5 w-5 text-green-500 shrink-0 opacity-70" />}
              </Button>
            );
          })}
          {currentQuestion.questionType === 'subjective' && (
            <form onSubmit={handleSubjectiveSubmit} className="space-y-3">
              <Textarea
                value={subjectiveAnswer}
                onChange={(e) => setSubjectiveAnswer(e.target.value)}
                placeholder="Type your answer here, or use the microphone to dictate."
                rows={4}
                className="font-body text-base"
                disabled={showFeedback || isSubmittingSubjective}
              />
              <Button
                type="submit"
                className="w-full text-base py-3"
                disabled={showFeedback || isSubmittingSubjective || subjectiveAnswer.trim() === ""}
              >
                {isSubmittingSubjective ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                Submit Answer
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch space-y-4 pt-6">
          {showFeedback && (
            <Alert
              variant={isAnswerCorrect === true ? "default" : "destructive"}
              className={cn(
                "animate-slide-in-from-bottom",
                isAnswerCorrect === true ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
                                       : "bg-red-50 border-red-300 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300"
             )}
            >
              <div className="flex items-center">
                {isAnswerCorrect === true ? <CheckCircle2 className="h-5 w-5 mr-2" /> : (isAnswerCorrect === false ? <XCircle className="h-5 w-5 mr-2" /> : <Lightbulb className="h-5 w-5 mr-2"/> )}
                <AlertTitle className="font-headline">
                  {isAnswerCorrect === true ? "Correct!" : (isAnswerCorrect === false ? "Incorrect" : "Feedback")}
                </AlertTitle>
              </div>
              {feedbackText && (
                <AlertDescription className="font-body mt-1">
                  <Lightbulb className="inline h-4 w-4 mr-1" />
                  {feedbackText}
                </AlertDescription>
              )}
              {currentQuestion.explanation && (!feedbackText || currentQuestion.questionType === 'multiple-choice' || isAnswerCorrect === true) && (
                <AlertDescription className="font-body mt-1">
                   {!feedbackText && <Lightbulb className="inline h-4 w-4 mr-1" /> }
                   <strong>Explanation:</strong> {currentQuestion.explanation}
                </AlertDescription>
              )}
              {isAnswerCorrect === false && currentQuestion.questionType === 'subjective' && currentQuestion.referenceAnswer && (
                 <AlertDescription className="font-body mt-2 pt-2 border-t border-destructive/30 dark:border-destructive/50">
                    <strong className="font-headline text-base">Model Answer:</strong>
                    <p className="mt-1">{currentQuestion.referenceAnswer}</p>
                </AlertDescription>
              )}

               {isAutoAdvanceEnabled && timeLeftForAutoAdvance > 0 && (quizData && currentQuestionIndex < quizData.questions.length -1) && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                  <div className="flex items-center">
                    <TimerIcon className="h-4 w-4 mr-1 animate-pulse"/>
                    Next question in {Math.ceil(timeLeftForAutoAdvance / 1000)}s...
                    <Progress value={(AUTO_ADVANCE_DELAY - timeLeftForAutoAdvance) / AUTO_ADVANCE_DELAY * 100} className="w-20 h-1 ml-2" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelAutoAdvance}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Cancel auto-advance"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Alert>
          )}
          <div className="flex justify-between items-center mt-2 space-x-2">
            <Button
              onClick={handlePreviousQuestion}
              variant="outline"
              className="text-base py-3"
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Previous
            </Button>
            <Button
              onClick={handleNextQuestion}
              className="text-base py-3"
              disabled={isSubmittingSubjective}
            >
              {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </CardFooter>
      </Card>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center w-full max-w-2xl">
        <Button onClick={() => { clearQuiz(); router.push('/'); }} variant="link" className="text-muted-foreground order-2 sm:order-1">
            <RotateCcw className="mr-2 h-4 w-4" /> Start New Quiz
        </Button>
        <Button onClick={handleEndQuiz} variant="outline" className="w-full sm:w-auto order-1 sm:order-2 text-base py-3 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="mr-2 h-5 w-5" /> End Test Now
        </Button>
       </div>
    </div>
  );
}

