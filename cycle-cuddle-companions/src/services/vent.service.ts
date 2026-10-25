import { apiClient, mockDelay, USE_MOCK_API } from "@/lib/api/client";
import { SYMPTOM_KEYWORDS } from "@/data/mock";
import type { VentResponse } from "@/types";

export function detectSymptoms(text: string): string[] {
  const lower = text.toLowerCase();
  return Object.entries(SYMPTOM_KEYWORDS)
    .filter(([, words]) => words.some((w) => lower.includes(w)))
    .map(([name]) => name);
}

const RESPONSES = [
  "Thank you for sharing that. What you're feeling is valid, and you don't have to push through it alone.",
  "That sounds like a lot to carry today. It's okay to slow down and be gentle with yourself.",
  "I hear you. Your body is doing real work right now — rest counts as taking care of yourself.",
];

export const ventService = {
  async submit(text: string): Promise<VentResponse> {
    if (!USE_MOCK_API) return apiClient.post<VentResponse>("/vent", { text });
    const message = RESPONSES[text.length % RESPONSES.length]!;
    return mockDelay({ message, suggestedSymptoms: detectSymptoms(text) }, 600);
  },
};
