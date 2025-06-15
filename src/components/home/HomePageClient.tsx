
"use client";

import { useState, useRef, type ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { parseJsonQuiz } from '@/lib/quizParser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/common/AppLogo';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileJson, DownloadCloud } from 'lucide-react';

export function HomePageClient() {
  const router = useRouter();
  const { quizData, setQuizData, clearQuiz } = useQuiz();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (file.type === "application/json" || file.name.endsWith(".json")) {
          const parsedData = parseJsonQuiz(content);
          if (parsedData) {
            setQuizData(parsedData);
            toast({
              title: "Quiz Loaded!",
              description: `"${parsedData.title}" is ready.`,
            });
          } else {
            toast({
              title: "Error",
              description: "Failed to parse JSON quiz file. Please check the format.",
              variant: "destructive",
            });
            setFileName(null);
          }
        } else {
            toast({
                title: "Unsupported File Type",
                description: "Please upload a JSON file (.json). Text import is not fully supported yet.",
                variant: "destructive",
            });
            setFileName(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleStartQuiz = () => {
    if (quizData) {
      router.push('/quiz');
    } else {
      toast({
        title: "No Quiz Loaded",
        description: "Please import a quiz file first, or download our sample.",
        variant: "destructive",
      });
    }
  };

  // Clear any previous quiz state when returning to home
  useEffect(() => {
    clearQuiz();
  }, [clearQuiz]);

  const handleDownloadSample = () => {
    const link = document.createElement('a');
    link.href = '/sample-quiz.json';
    link.download = 'sample-quiz.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Sample Quiz Downloading",
      description: "sample-quiz.json has started downloading.",
    });
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <AppLogo className="mb-4 mx-auto" />
          <CardDescription className="font-body text-lg">
            Test your knowledge! Upload a quiz file or download our sample to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full text-base py-6"
            >
              <UploadCloud className="mr-2 h-5 w-5" />
              Import Quiz File (.json)
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".json"
            />
            {fileName && (
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center">
                <FileJson className="mr-2 h-4 w-4 text-primary" /> Loaded: {fileName}
              </p>
            )}
          </div>

          <Button onClick={handleStartQuiz} className="w-full text-lg py-6">
            Start Quiz
          </Button>

          <Button
            onClick={handleDownloadSample}
            variant="secondary"
            className="w-full text-base py-3"
          >
            <DownloadCloud className="mr-2 h-5 w-5" />
            Download Sample Quiz
          </Button>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        {currentYear !== null ? (
          <p>&copy; {currentYear} Quiz Whiz. Create, learn, and explore!</p>
        ) : (
          <p>Loading year...</p>
        )}
      </footer>
    </div>
  );
}
