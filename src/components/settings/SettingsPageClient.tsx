
"use client";

import { useRouter } from 'next/navigation';
import { useQuiz } from '@/context/QuizContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AppLogo } from '@/components/common/AppLogo';
import { ArrowLeft, Volume2, VolumeX, TimerReset, FastForward, Mic, MicOff } from 'lucide-react';

export function SettingsPageClient() {
  const router = useRouter();
  const { 
    isSpeakerEnabled, 
    setIsSpeakerEnabled,
    isAutoAdvanceEnabled,
    setIsAutoAdvanceEnabled,
    isAutoMicEnabled,
    setIsAutoMicEnabled
  } = useQuiz();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <AppLogo className="mb-4 mx-auto" />
          <CardTitle className="font-headline text-3xl">Settings</CardTitle>
          <CardDescription className="font-body text-lg">
            Customize your Quiz Whiz experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              {isSpeakerEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
              <Label htmlFor="speaker-toggle" className="text-base font-body">
                Enable Read Aloud Speaker
              </Label>
            </div>
            <Switch
              id="speaker-toggle"
              checked={isSpeakerEnabled}
              onCheckedChange={setIsSpeakerEnabled}
              aria-label="Toggle read aloud speaker"
            />
          </div>

          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              {isAutoAdvanceEnabled ? <FastForward className="h-6 w-6 text-primary" /> : <TimerReset className="h-6 w-6 text-muted-foreground" />}
              <Label htmlFor="auto-advance-toggle" className="text-base font-body">
                Enable Auto-Advance to Next Question
              </Label>
            </div>
            <Switch
              id="auto-advance-toggle"
              checked={isAutoAdvanceEnabled}
              onCheckedChange={setIsAutoAdvanceEnabled}
              aria-label="Toggle auto-advance to next question"
            />
          </div>

          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              {isAutoMicEnabled ? <Mic className="h-6 w-6 text-primary" /> : <MicOff className="h-6 w-6 text-muted-foreground" />}
              <Label htmlFor="auto-mic-toggle" className="text-base font-body">
                Auto-Enable Microphone on New Question
              </Label>
            </div>
            <Switch
              id="auto-mic-toggle"
              checked={isAutoMicEnabled}
              onCheckedChange={setIsAutoMicEnabled}
              aria-label="Toggle auto-enable microphone"
            />
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full text-base py-3">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Home
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
