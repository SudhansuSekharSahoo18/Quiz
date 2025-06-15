"use server";

import { recommendNextTopic as recommendNextTopicFlow, type RecommendNextTopicInput, type RecommendNextTopicOutput } from '@/ai/flows/recommend-next-topic';

export async function getTopicRecommendation(input: RecommendNextTopicInput): Promise<RecommendNextTopicOutput | { error: string }> {
  try {
    const recommendation = await recommendNextTopicFlow(input);
    return recommendation;
  } catch (error) {
    console.error("Error getting topic recommendation:", error);
    return { error: "Failed to get topic recommendation. Please try again." };
  }
}
