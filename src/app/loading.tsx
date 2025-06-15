import { Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/common/AppLogo';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <AppLogo className="mb-8 text-5xl" />
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg font-body">Loading your awesome quiz experience...</p>
    </div>
  );
}
