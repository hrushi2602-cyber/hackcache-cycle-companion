import { apiClient, mockDelay, USE_MOCK_API } from "@/lib/api/client";
import type { CycleData } from "@/types";

// Starts empty: we never invent a user's cycle data.
let cycle: CycleData | null = null;

export const cycleService = {
  async get(): Promise<CycleData | null> {
    if (!USE_MOCK_API) return apiClient.get<CycleData | null>("/cycle");
    return mockDelay(cycle, 150);
  },
  async save(data: CycleData): Promise<CycleData> {
    if (!USE_MOCK_API) return apiClient.post<CycleData>("/cycle", data);
    cycle = data;
    return mockDelay(data, 250);
  },
};

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (iso: string) => new Date(iso + "T00:00:00");

/** Simple calendar-math estimate. Not a medical prediction. */
export function estimateCycle(data: CycleData, today = new Date()) {
  const start = parse(data.lastPeriodStart);
  const t = parse(today.toISOString().slice(0, 10));
  const diff = Math.floor((t.getTime() - start.getTime()) / 86400000);
  const cycleDay = ((diff % data.cycleLength) + data.cycleLength) % data.cycleLength + 1;
  const next = new Date(start);
  next.setDate(start.getDate() + Math.ceil((diff + 1) / data.cycleLength) * data.cycleLength);
  if (next <= t) next.setDate(next.getDate() + data.cycleLength);
  const daysUntilNext = Math.round((next.getTime() - t.getTime()) / 86400000);
  return { cycleDay, nextPeriodEstimate: next, daysUntilNext };
}

/** Recorded = the period days the user entered. Estimated = the next few predicted periods. */
export function periodDates(data: CycleData, upcoming = 3) {
  const recorded = new Set<string>();
  const estimated = new Set<string>();
  const start = parse(data.lastPeriodStart);
  for (let c = 0; c <= upcoming; c++) {
    for (let d = 0; d < data.periodLength; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + c * data.cycleLength + d);
      (c === 0 ? recorded : estimated).add(toISO(day));
    }
  }
  return { recorded, estimated };
}

export function validateCycle(input: { lastPeriodStart: string; cycleLength: string; periodLength: string }, today = new Date()) {
  const errors: Partial<Record<"lastPeriodStart" | "cycleLength" | "periodLength", string>> = {};
  if (!input.lastPeriodStart) errors.lastPeriodStart = "Please choose a date.";
  else if (input.lastPeriodStart > toISO(today)) errors.lastPeriodStart = "This date can't be in the future.";
  const cl = Number(input.cycleLength);
  if (!Number.isInteger(cl) || cl < 15 || cl > 60) errors.cycleLength = "Enter a whole number between 15 and 60.";
  const pl = Number(input.periodLength);
  if (!Number.isInteger(pl) || pl < 1 || pl > 14) errors.periodLength = "Enter a whole number between 1 and 14.";
  else if (!errors.cycleLength && pl >= cl) errors.periodLength = "Period length should be shorter than the cycle.";
  return errors;
}
