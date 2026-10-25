import { apiClient, mockDelay, USE_MOCK_API } from "@/lib/api/client";
import { mockCapsuleNotes } from "@/data/mock";
import type { CapsuleNote } from "@/types";

let notes: CapsuleNote[] = [...mockCapsuleNotes];

export const capsuleService = {
  async list(): Promise<CapsuleNote[]> {
    if (!USE_MOCK_API) return apiClient.get<CapsuleNote[]>("/capsule");
    return mockDelay([...notes]);
  },
  async add(text: string): Promise<CapsuleNote> {
    if (!USE_MOCK_API) return apiClient.post<CapsuleNote>("/capsule", { text });
    const note = { id: crypto.randomUUID(), createdAt: new Date().toISOString().slice(0, 10), text };
    notes = [note, ...notes];
    return mockDelay(note);
  },
};
