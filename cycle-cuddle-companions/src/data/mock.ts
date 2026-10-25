import type { CapsuleNote, CommunityPost, SurvivalCard, SymptomEntry } from "@/types";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  Cramps: ["cramp", "cramps", "cramping", "stomach hurts", "pelvic"],
  Fatigue: ["tired", "exhausted", "fatigue", "drained", "no energy", "sleepy"],
  Headache: ["headache", "head hurts", "migraine"],
  Bloating: ["bloat", "bloated", "bloating", "puffy"],
  "Low mood": ["sad", "down", "cry", "crying", "low", "hopeless"],
  Irritability: ["irritable", "angry", "snappy", "annoyed", "frustrated"],
  Anxiety: ["anxious", "anxiety", "worried", "on edge", "nervous"],
  "Brain fog": ["focus", "concentrate", "foggy", "brain fog", "distracted"],
  "Back pain": ["back pain", "lower back", "back hurts"],
  Cravings: ["craving", "cravings", "hungry", "chocolate"],
};

export const mockSymptomHistory: SymptomEntry[] = [
  { id: "s1", date: daysAgo(1), symptoms: ["Fatigue", "Cramps"] },
  { id: "s2", date: daysAgo(2), symptoms: ["Cramps", "Bloating"] },
  { id: "s3", date: daysAgo(4), symptoms: ["Low mood"] },
  { id: "s4", date: daysAgo(6), symptoms: ["Headache", "Fatigue"] },
  { id: "s5", date: daysAgo(9), symptoms: ["Brain fog"] },
  { id: "s6", date: daysAgo(12), symptoms: ["Irritability", "Cravings"] },
];

export const mockSurvivalCards: SurvivalCard[] = [
  { id: "fatigue", title: "Fatigue", icon: "battery", summary: "When even small tasks feel heavy.", tips: [
    "Drink a glass of water — keep a bottle within reach.",
    "Pick one task for today. Everything else can wait.",
    "Rest lying down for 10 minutes, no phone.",
    "Choose an easy snack with some protein.",
  ] },
  { id: "cramps", title: "Cramps", icon: "flame", summary: "Gentle comfort with minimal effort.", tips: [
    "Place a warm (not hot) heat pack on your lower belly.",
    "Try curling up on your side with knees bent.",
    "Slow belly breaths: in for 4, out for 6.",
    "If pain is severe or unusual for you, contact a healthcare professional.",
  ] },
  { id: "overwhelm", title: "Emotional overwhelm", icon: "cloud", summary: "When feelings are loud and space is small.", tips: [
    "Name it out loud: “I'm overwhelmed, and that's okay.”",
    "Hold something cold or textured to ground yourself.",
    "Text one person you trust a single emoji.",
    "Step outside or near a window for two minutes.",
  ] },
  { id: "focus", title: "Difficulty concentrating", icon: "brain", summary: "Working with a foggy brain, not against it.", tips: [
    "Set a 10-minute timer and do just one small piece.",
    "Write the next step on a sticky note.",
    "Close every tab except the one you need.",
    "Lower the bar: “done” beats “perfect” today.",
  ] },
];

export const mockCommunityPosts: CommunityPost[] = [
  { id: "p1", author: "Quiet Fern", body: "Day 2 and I cancelled plans to stay in with a heat pad. Trying not to feel guilty about it.", postedAgo: "2h ago", reactions: 24, reacted: false },
  { id: "p2", author: "Gentle Otter", body: "Reminder to myself and anyone reading: resting is productive too.", postedAgo: "5h ago", reactions: 51, reacted: false },
  { id: "p3", author: "Soft Moon", body: "The brain fog this week is real. Made a list of three things and did one. Counting it as a win.", postedAgo: "1d ago", reactions: 37, reacted: false },
  { id: "p4", author: "Warm Pebble", body: "Cried at a dog food commercial. We move.", postedAgo: "2d ago", reactions: 88, reacted: false },
];

export const ANON_NAMES = ["Calm Willow", "Bright Sparrow", "Kind Cloud", "Steady Fox", "Soft Clover", "Quiet River"];

export const mockCapsuleNotes: CapsuleNote[] = [
  { id: "c1", createdAt: daysAgo(20), text: "Future me: last month the first two days were rough, and you got through them. Pack snacks and go easy on yourself." },
];
