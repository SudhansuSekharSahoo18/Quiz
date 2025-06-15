import { Landmark, FlaskConical, BookOpen, Lightbulb, Sigma, Globe, Trophy, Puzzle, Brain } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  category?: string;
}

export function CategoryIcon({ category, className, ...props }: CategoryIconProps) {
  const defaultSize = 20;
  const iconProps = { size: defaultSize, ...props, className };

  switch (category?.toLowerCase()) {
    case 'history':
      return <Landmark {...iconProps} />;
    case 'science':
      return <FlaskConical {...iconProps} />;
    case 'literature':
      return <BookOpen {...iconProps} />;
    case 'math':
      return <Sigma {...iconProps} />;
    case 'geography':
      return <Globe {...iconProps} />;
    case 'sports':
      return <Trophy {...iconProps} />;
    case 'general knowledge':
      return <Brain {...iconProps} />;
    case 'puzzles':
        return <Puzzle {...iconProps} />;
    default:
      return <Lightbulb {...iconProps} />;
  }
}
