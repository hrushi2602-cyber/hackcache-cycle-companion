import { apiClient, mockDelay, USE_MOCK_API } from "@/lib/api/client";
import { mockSurvivalCards } from "@/data/mock";
import type { SurvivalCard } from "@/types";

export const survivalService = {
  async list(): Promise<SurvivalCard[]> {
    if (!USE_MOCK_API) return apiClient.get<SurvivalCard[]>("/survival-cards");
    return mockDelay(mockSurvivalCards, 150);
  },
};
