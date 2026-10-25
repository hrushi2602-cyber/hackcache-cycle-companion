import { apiClient, USE_MOCK_API } from "@/lib/api/client";
import type { VoiceNote } from "@/types";

/**
 * Voice notes for the Self-Time Capsule. PROPOSED endpoints — not yet confirmed.
 * Recording/upload isn't connected in the UI; demo mode never pretends to store audio.
 */
export const voiceNotesService = {
  available: false,
  async list(): Promise<VoiceNote[]> {
    if (!USE_MOCK_API) return apiClient.get<VoiceNote[]>("/capsule/voice-notes");
    return [];
  },
  async upload(file: Blob, filename = "note.webm"): Promise<VoiceNote> {
    if (USE_MOCK_API) throw new Error("Audio uploads aren't connected yet in demo mode.");
    const form = new FormData();
    form.append("file", file, filename);
    return apiClient.postForm<VoiceNote>("/capsule/voice-notes", form);
  },
};
