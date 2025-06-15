
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import type { QuizQuestion, QuizOption } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, RotateCcw, Volume2, Mic, MicOff, Loader2, TimerIcon } from 'lucide-react';
import { AppLogo } from '@/components/common/AppLogo';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// SpeechRecognition types might not be in standard lib.d.ts
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  // Add other properties if needed
}

const AUTO_ADVANCE_DELAY = 3000; // 3 seconds

export function QuizPageClient() {
  const router = useRouter();
  const { quizData, setQuizResult, clearQuiz } = useQuiz();
  const { toast } = useToast();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [timeLeftForAutoAdvance, setTimeLeftForAutoAdvance] = useState(0);

  const currentQuestion: QuizQuestion | undefined = useMemo(() =>
    quizData?.questions[currentQuestionIndex],
    [quizData, currentQuestionIndex]
  );

  useEffect(() => {
    if (!quizData || quizData.questions.length === 0) {
      router.replace('/');
    } else {
      setStartTime(Date.now());
    }
  }, [quizData, router]);


  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setHasSpeechSupport(false);
      recognitionRef.current = null;
      return;
    }

    setHasSpeechSupport(true);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const rawTranscript = event.results[0][0].transcript;
      const initialProcessedTranscript = rawTranscript.trim().toLowerCase().replace(/[.,!?;:"']/g, '');

      const numberWordsToDigits: { [key: string]: string } = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      };

      const words = initialProcessedTranscript.split(' ');
      const convertedWords = words.map(word => numberWordsToDigits[word] || word);
      const digitizedTranscript = convertedWords.join(' ');

      if (!currentQuestion) {
          setIsListening(false);
          return;
      }

      let foundOption: QuizOption | undefined = undefined;

      const attemptMatch = (transcript: string): QuizOption | undefined => {
          let optionMatch: QuizOption | undefined;
          // Priority 1: Exact match
          optionMatch = currentQuestion.options.find(
              opt => opt.text.trim().toLowerCase() === transcript
          );

          // Priority 2: Single token prefix match (e.g. "6" matches "6 apples" but not "60")
          if (!optionMatch) {
              const transcriptTokens = transcript.split(' ');
              if (transcriptTokens.length === 1) {
                  const singleToken = transcriptTokens[0];
                  optionMatch = currentQuestion.options.find(opt => {
                      const optText = opt.text.trim().toLowerCase();
                      // Option is exactly the token
                      if (optText === singleToken) return true;
                      // Option starts with the token and is followed by a non-alphanumeric char or end of string
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

      if (!foundOption && digitizedTranscript !== initialProcessedTranscript) {
          foundOption = attemptMatch(initialProcessedTranscript);
      }

      if (foundOption) {
        handleOptionSelect(foundOption);
      } else {
        let debugMessage = `(Processed: "${initialProcessedTranscript}"`;
        if (digitizedTranscript !== initialProcessedTranscript) {
            debugMessage += `, Digitized: "${digitizedTranscript}"`;
        }
        debugMessage += ")";
        const errorMessage = `Could not match: "${rawTranscript}". Please try again or select manually. ${debugMessage}`;
        setSpeechError(errorMessage);
        toast({
          title: "No Match Found",
          description: `"${rawTranscript}" did not match an option. ${debugMessage}`,
          variant: "destructive"
        });
      }
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      setSpeechError(errorMessage);
      setIsListening(false);
      toast({
          title: "Speech Error",
          description: event.error === 'no-speech' ? "No speech detected." : `Error: ${event.error}`,
          variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion, toast]); // Ensure effect re-runs if currentQuestion or toast changes


  // Cancel other speech and timer if the question changes or listening state changes
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.stop();
    }

    setSpeechError(null);

    // This effect specifically handles cleanup related to question/listening state changes,
    // autoAdvanceTimerRef is managed by handleOptionSelect and general unmount.
  }, [currentQuestionIndex, isListening]);

  // Countdown timer display effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showFeedback && timeLeftForAutoAdvance > 0) {
      interval = setInterval(() => {
        setTimeLeftForAutoAdvance(prev => Math.max(0, prev - 100));
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeLeftForAutoAdvance, showFeedback]);

  // General cleanup for autoAdvanceTimerRef on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, []);


  if (!quizData || !currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AppLogo className="mb-4" />
        <p className="text-lg font-body mb-4">Loading quiz or no quiz data found...</p>
        <Button onClick={() => router.push('/')} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" /> Go to Home
        </Button>
      </div>
    );
  }

  const handleReadAloud = (text: string) => {
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
  };

  const handleOptionSelect = (option: QuizOption) => {
    if (showFeedback) return;

    setSelectedOptionId(option.id);
    const correct = option.isCorrect;
    setIsAnswerCorrect(correct);
    if (correct) {
      setScore((prevScore) => prevScore + 1);
    }
    setShowFeedback(true);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1;
    if (!isLastQuestion) {
      setTimeLeftForAutoAdvance(AUTO_ADVANCE_DELAY);
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      autoAdvanceTimerRef.current = setTimeout(() => {
        handleNextQuestion();
      }, AUTO_ADVANCE_DELAY);
    } else {
      setTimeLeftForAutoAdvance(0);
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    }
  };

  const handleNextQuestion = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setTimeLeftForAutoAdvance(0);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setShowFeedback(false);
    setSelectedOptionId(null);
    setIsAnswerCorrect(null);
    setSpeechError(null);

    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      setQuizResult({
        score,
        totalQuestions: quizData.questions.length,
        quizTitle: quizData.title,
      });
      router.push('/results');
    }
  };

  const toggleListening = () => {
    if (!hasSpeechSupport || !recognitionRef.current) {
        toast({
            title: "Speech Recognition Not Available",
            description: "Cannot start microphone. This feature may not be supported by your browser.",
            variant: "destructive"
        });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error: any) {
        console.error("Error starting speech recognition:", error);
        const errorMessage = error.message || error.name || 'Unknown error';
        if (error && error.name === 'InvalidStateError' && error.message && error.message.includes('recognition has already started')) {
          // If it's already started (e.g. due to rapid clicks or state lag), just ensure our state reflects it.
          setIsListening(true);
          setSpeechError(null); // Clear any previous error
        } else {
          setSpeechError(`Could not start microphone. Error: ${errorMessage}`);
          setIsListening(false);
          toast({
              title: "Microphone Error",
              description: `Could not start microphone. ${errorMessage}. Please check permissions.`,
              variant: "destructive"
          });
        }
      }
    }
  };

  const progressValue = (currentQuestionIndex / quizData.questions.length) * 100;

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
                 <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleReadAloud(currentQuestion.questionText)}
                  aria-label="Read question aloud"
                  title="Read question aloud"
                  className="text-primary hover:text-primary/80"
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
                {hasSpeechSupport && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleListening}
                        aria-label={isListening ? "Stop listening" : "Answer with microphone"}
                        title={isListening ? "Stop listening" : "Answer with microphone"}
                        className={cn(
                            "text-primary hover:text-primary/80",
                            isListening && "text-destructive animate-pulse"
                        )}
                        disabled={showFeedback}
                    >
                        {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>
                )}
              </div>
            </div>
             {isListening && (
                <div className="mt-2 text-sm text-primary flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Listening...
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
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            let buttonVariant: "outline" | "default" | "secondary" | "destructive" = "outline";

            if (showFeedback && isSelected) {
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
                  showFeedback && isSelected && isAnswerCorrect && "bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300",
                  showFeedback && isSelected && !isAnswerCorrect && "bg-red-100 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300",
                  showFeedback && !isSelected && option.isCorrect && "bg-green-50 dark:bg-green-950 border-green-300 text-green-600 dark:text-green-400",
                  showFeedback && "cursor-not-allowed opacity-80"
                )}
                disabled={showFeedback}
                aria-pressed={isSelected}
              >
                <span className="flex-grow">{option.text}</span>
                 {showFeedback && isSelected && (isAnswerCorrect ? <CheckCircle2 className="ml-2 h-5 w-5 text-green-500 shrink-0" /> : <XCircle className="ml-2 h-5 w-5 text-red-500 shrink-0" />)}
                 {showFeedback && !isSelected && option.isCorrect && <CheckCircle2 className="ml-2 h-5 w-5 text-green-500 shrink-0 opacity-70" />}

              </Button>
            );
          })}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch space-y-4">
          {showFeedback && (
            <Alert variant={isAnswerCorrect ? "default" : "destructive"} className={cn(
              "animate-slide-in-from-bottom",
              isAnswerCorrect ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300" : "bg-red-50 border-red-300 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300"
            )}>
              <div className="flex items-center">
                {isAnswerCorrect ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
                <AlertTitle className="font-headline">
                  {isAnswerCorrect ? "Correct!" : "Incorrect"}
                </AlertTitle>
              </div>
              {currentQuestion.explanation && (
                <AlertDescription className="font-body mt-1">
                  <Lightbulb className="inline h-4 w-4 mr-1" />
                  {currentQuestion.explanation}
                </AlertDescription>
              )}
               {timeLeftForAutoAdvance > 0 && (currentQuestionIndex < quizData.questions.length -1) && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center">
                  <TimerIcon className="h-4 w-4 mr-1 animate-pulse"/>
                  Next question in {Math.ceil(timeLeftForAutoAdvance / 1000)}s...
                  <Progress value={(AUTO_ADVANCE_DELAY - timeLeftForAutoAdvance) / AUTO_ADVANCE_DELAY * 100} className="w-1/3 h-1 ml-2" />
                </div>
              )}
            </Alert>
          )}
          {showFeedback && (
            <Button onClick={handleNextQuestion} className="w-full text-lg py-3">
              {currentQuestionIndex === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </CardFooter>
      </Card>
       <Button onClick={() => { clearQuiz(); router.push('/'); }} variant="link" className="mt-6 text-muted-foreground">
        <RotateCcw className="mr-2 h-4 w-4" /> Start New Quiz
      </Button>
    </div>
  );
}
