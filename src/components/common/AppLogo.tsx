import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface AppLogoProps extends HTMLAttributes<HTMLHeadingElement> {
  // Additional props can be added if needed
}

export function AppLogo({ className, ...props }: AppLogoProps) {
  return (
    <h1 className={cn("text-5xl font-headline text-primary tracking-tight", className)} {...props}>
      Quiz Whiz
    </h1>
  );
}
