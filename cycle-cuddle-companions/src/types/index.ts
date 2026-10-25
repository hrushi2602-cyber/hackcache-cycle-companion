export interface SymptomEntry {
  id: string;
  date: string; // ISO date
  symptoms: string[];
  note?: string | undefined;
}

export interface VentResponse {
  message: string;
  suggestedSymptoms: string[];
}

export interface SurvivalCard {
  id: string;
  title: string;
  icon: "battery" | "flame" | "cloud" | "brain";
  summary: string;
  tips: string[];
}

export interface CommunityPost {
  id: string;
  author: string;
  body: string;
  postedAgo: string;
  reactions: number;
  reacted: boolean;
  isOwn?: boolean;
}

export interface CycleData {
  lastPeriodStart: string; // ISO date, entered by the user
  cycleLength: number;
  periodLength: number;
}

export interface CapsuleNote {
  id: string;
  createdAt: string;
  text: string;
}

export interface VoiceNote {
  id: string;
  createdAt: string;
  durationSeconds: number;
  url: string;
}
