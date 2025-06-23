
"use server";

import { recommendNextTopic as recommendNextTopicFlow, type RecommendNextTopicInput, type RecommendNextTopicOutput } from '@/ai/flows/recommend-next-topic';
import { gradeSubjectiveAnswer as gradeSubjectiveAnswerFlow, type GradeSubjectiveAnswerInput, type GradeSubjectiveAnswerOutput } from '@/ai/flows/grade-subjective-answer-flow';

export async function getTopicRecommendation(input: RecommendNextTopicInput): Promise<RecommendNextTopicOutput | { error: string }> {
  try {
    const recommendation = await recommendNextTopicFlow(input);
    return recommendation;
  } catch (error) {
    console.error("Error getting topic recommendation:", error);
    return { error: "Failed to get topic recommendation. Please try again." };
  }
}

export async function submitSubjectiveAnswer(input: GradeSubjectiveAnswerInput): Promise<GradeSubjectiveAnswerOutput | { error: string }> {
  try {
    if (!input.userAnswer || input.userAnswer.trim() === "") {
      return { isCorrect: false, feedback: "Please provide an answer." };
    }
    const result = await gradeSubjectiveAnswerFlow(input);
    return result;
  } catch (error) {
    console.error("Error grading subjective answer:", error);
    // const errorMessage = (error instanceof Error) ? error.message : String(error);
    // Return a user-friendly message instead of the raw error
    return { error: "The AI grading service experienced an issue. Your answer could not be graded at this time. Please proceed to the next question." };
  }
}

