
'use server';
/**
 * @fileOverview A Genkit flow to grade subjective quiz answers using an AI model.
 *
 * - gradeSubjectiveAnswer - A function that handles the AI-based grading.
 * - GradeSubjectiveAnswerInput - The input type for the grading function.
 * - GradeSubjectiveAnswerOutput - The return type for the grading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeSubjectiveAnswerInputSchema = z.object({
  questionText: z.string().describe('The text of the subjective question asked.'),
  userAnswer: z.string().describe("The user's written answer to the question."),
  referenceAnswer: z.string().describe('A model or ideal answer to the question for comparison.'),
});
export type GradeSubjectiveAnswerInput = z.infer<typeof GradeSubjectiveAnswerInputSchema>;

const GradeSubjectiveAnswerOutputSchema = z.object({
  isCorrect: z.boolean().describe('True if the user answer is considered at least 70% correct, false otherwise.'),
  feedback: z.string().describe('A brief explanation for the grading decision (e.g., why it was marked correct or incorrect).'),
});
export type GradeSubjectiveAnswerOutput = z.infer<typeof GradeSubjectiveAnswerOutputSchema>;

export async function gradeSubjectiveAnswer(input: GradeSubjectiveAnswerInput): Promise<GradeSubjectiveAnswerOutput> {
  if (input.userAnswer.trim() === '') {
    return {
      isCorrect: false,
      feedback: "The answer was left blank. Please provide an answer.",
    };
  }
  return gradeSubjectiveAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'gradeSubjectiveAnswerPrompt',
  input: {schema: GradeSubjectiveAnswerInputSchema},
  output: {schema: GradeSubjectiveAnswerOutputSchema},
  prompt: `You are an AI assistant that grades subjective quiz answers.
The question asked was:
"{{questionText}}"

A model correct answer or key points to look for are:
"{{referenceAnswer}}"

The user's submitted answer is:
"{{userAnswer}}"

Your task is to analyze the user's answer in comparison to the model answer.
Determine if the user's answer captures at least 70% of the key concepts, accuracy, and completeness demonstrated in the model answer.

Output your assessment strictly as a JSON object with two fields:
1.  "isCorrect": A boolean value. Set to true if the user's answer meets the 70% correctness threshold, otherwise set to false.
2.  "feedback": A concise, one or two-sentence string explaining your reasoning for the "isCorrect" value. This feedback should be helpful to the user.

Focus on conceptual understanding and the inclusion of critical information. Minor grammatical errors or stylistic differences in the user's answer should not be the primary reason for marking it incorrect, unless they significantly obscure the meaning or lead to factual inaccuracies.
If the user's answer is very short and clearly misses the main points, it should be marked false.
If the user's answer, while perhaps not as detailed as the model, still conveys the core concepts accurately, it can be marked true.
`,
});

const gradeSubjectiveAnswerFlow = ai.defineFlow(
  {
    name: 'gradeSubjectiveAnswerFlow',
    inputSchema: GradeSubjectiveAnswerInputSchema,
    outputSchema: GradeSubjectiveAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        // This case should ideally be handled by Genkit's error handling or schema validation
        // but as a fallback:
        return {
            isCorrect: false,
            feedback: "There was an issue grading the answer. The AI did not provide a valid response.",
        };
    }
    return output;
  }
);
