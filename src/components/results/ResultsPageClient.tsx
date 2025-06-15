"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getTopicRecommendation } from '@/lib/actions';
import type { RecommendNextTopicOutput } from '@/ai/flows/recommend-next-topic';
import { AppLogo } from '@/components/common/AppLogo';
import { Lightbulb, RefreshCw, Home, BarChart3, Wand2, Loader2 } from 'lucide-react';

export function ResultsPageClient() {
  const router = useRouter();
  const { quizResult, clearQuiz } = useQuiz();
  const [recommendation, setRecommendation] = useState<RecommendNextTopicOutput | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [errorRecommendation, setErrorRecommendation] = useState<string | null>(null);

  useEffect(() => {
    if (!quizResult) {
      router.replace('/'); // Redirect if no result is found
    }
  }, [quizResult, router]);

  if (!quizResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
         <AppLogo className="mb-4" />
        <p className="text-lg font-body">Loading results or no results found...</p>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-4">
          <Home className="mr-2 h-4 w-4" /> Go to Home
        </Button>
      </div>
    );
  }

  const { score, totalQuestions, quizTitle } = quizResult;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  let feedbackMessage = "";
  if (percentage >= 80) feedbackMessage = "Excellent work! You really know your stuff!";
  else if (percentage >= 60) feedbackMessage = "Good job! Solid performance.";
  else if (percentage >= 40) feedbackMessage = "Not bad! Keep practicing to improve.";
  else feedbackMessage = "Keep learning and try again! Every attempt is progress.";

  const handleGetRecommendation = async () => {
    setIsLoadingRecommendation(true);
    setErrorRecommendation(null);
    setRecommendation(null);
    const result = await getTopicRecommendation({
      currentTopic: quizTitle,
      score,
      totalQuestions,
      // userInterests: "general knowledge" // Optional: could be made dynamic
    });
    setIsLoadingRecommendation(false);
    if ('error' in result) {
      setErrorRecommendation(result.error);
    } else {
      setRecommendation(result);
    }
  };

  const handlePlayAgain = () => {
    // For "Play Again" with the *same* quiz, we'd need to persist quizData or re-fetch.
    // For simplicity, "Play Again" will mean starting a new quiz (importing).
    clearQuiz();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <AppLogo className="mb-2 mx-auto" />
          <CardTitle className="font-headline text-3xl">Quiz Results</CardTitle>
          <CardDescription className="font-body text-md">
            For quiz: <span className="font-semibold text-primary">{quizTitle}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-6 bg-secondary/50 rounded-lg">
            <p className="font-headline text-5xl text-primary">{score} / {totalQuestions}</p>
            <p className="font-body text-2xl text-muted-foreground">({percentage}%)</p>
            <p className="font-body mt-3 text-lg">{feedbackMessage}</p>
          </div>

          {!recommendation && !isLoadingRecommendation && !errorRecommendation && (
            <Button onClick={handleGetRecommendation} className="w-full text-base py-3" disabled={isLoadingRecommendation}>
              <Wand2 className="mr-2 h-5 w-5" />
              Suggest Next Topic
            </Button>
          )}
          
          {isLoadingRecommendation && (
            <div className="flex items-center justify-center text-muted-foreground py-3">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Getting recommendation...
            </div>
          )}

          {errorRecommendation && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorRecommendation}</AlertDescription>
            </Alert>
          )}

          {recommendation && (
            <Card className="bg-accent/10 border-accent">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center">
                  <Lightbulb className="mr-2 h-5 w-5 text-accent" /> Next Topic Suggestion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-headline text-2xl text-accent">{recommendation.nextTopic}</p>
                <p className="font-body text-muted-foreground mt-1">{recommendation.reason}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={handlePlayAgain} variant="outline" className="w-full sm:w-auto">
            <RefreshCw className="mr-2 h-4 w-4" /> Play New Quiz
          </Button>
          <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
             <Home className="mr-2 h-4 w-4" /> Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
