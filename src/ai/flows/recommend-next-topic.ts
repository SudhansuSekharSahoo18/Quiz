// Recommend next topic flow
'use server';

/**
 * @fileOverview Recommends the next quiz topic based on the user's performance in the current quiz.
 *
 * - recommendNextTopic - A function that handles the recommendation of the next quiz topic.
 * - RecommendNextTopicInput - The input type for the recommendNextTopic function.
 * - RecommendNextTopicOutput - The return type for the recommendNextTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendNextTopicInputSchema = z.object({
  currentTopic: z.string().describe('The topic of the current quiz.'),
  score: z.number().describe('The user\'s score in the current quiz.'),
  totalQuestions: z.number().describe('The total number of questions in the quiz.'),
  userInterests: z.string().optional().describe('The user\'s interests, if available.'),
});
export type RecommendNextTopicInput = z.infer<typeof RecommendNextTopicInputSchema>;

const RecommendNextTopicOutputSchema = z.object({
  nextTopic: z.string().describe('The recommended next quiz topic.'),
  reason: z.string().describe('The reason for recommending this topic.'),
});
export type RecommendNextTopicOutput = z.infer<typeof RecommendNextTopicOutputSchema>;

export async function recommendNextTopic(input: RecommendNextTopicInput): Promise<RecommendNextTopicOutput> {
  return recommendNextTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendNextTopicPrompt',
  input: {schema: RecommendNextTopicInputSchema},
  output: {schema: RecommendNextTopicOutputSchema},
  prompt: `You are an AI quiz topic recommender. Based on the user's performance in the current quiz, you will recommend the next quiz topic.

Current topic: {{{currentTopic}}}
Score: {{{score}}} / {{{totalQuestions}}}

{{#if userInterests}}
User interests: {{{userInterests}}}
{{/if}}

Recommend a next topic, and briefly explain why you are recommending it. The "reason" field should be no more than one sentence long.
`,
});

const recommendNextTopicFlow = ai.defineFlow(
  {
    name: 'recommendNextTopicFlow',
    inputSchema: RecommendNextTopicInputSchema,
    outputSchema: RecommendNextTopicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
