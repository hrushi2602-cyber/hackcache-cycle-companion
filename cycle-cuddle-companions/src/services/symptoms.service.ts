import { apiClient, mockDelay, USE_MOCK_API } from "@/lib/api/client";
import { mockSymptomHistory } from "@/data/mock";
import type { SymptomEntry } from "@/types";

// Session-only store in demo mode — cleared on page reload.
let history: SymptomEntry[] = [...mockSymptomHistory];

export const symptomsService = {
  async list(): Promise<SymptomEntry[]> {
    if (!USE_MOCK_API) return apiClient.get<SymptomEntry[]>("/symptoms");
    return mockDelay([...history].sort((a, b) => b.date.localeCompare(a.date)));
  },
  async add(symptoms: string[], note?: string): Promise<SymptomEntry> {
    if (!USE_MOCK_API) return apiClient.post<SymptomEntry>("/symptoms", { symptoms, note });
    const entry: SymptomEntry = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), symptoms, note };
    history = [entry, ...history];
    return mockDelay(entry);
  },
};
