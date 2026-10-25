import { describe, expect, it } from "vitest";
import { detectSymptoms } from "@/services/vent.service";
import { estimateCycle, periodDates, validateCycle } from "@/services/cycle.service";
import { validateText } from "@/services/validation";

describe("vent symptom detection", () => {
  it("suggests symptoms from keywords", () => {
    expect(detectSymptoms("So tired and my cramps are bad")).toEqual(["Cramps", "Fatigue"]);
  });
  it("suggests nothing when no keywords match", () => {
    expect(detectSymptoms("Had a nice walk")).toEqual([]);
  });
});

describe("cycle", () => {
  const data = { lastPeriodStart: "2026-10-01", cycleLength: 28, periodLength: 5 };
  it("computes cycle day and days until next period", () => {
    const r = estimateCycle(data, new Date("2026-10-10T12:00:00Z"));
    expect(r.cycleDay).toBe(10);
    expect(r.daysUntilNext).toBe(19);
  });
  it("marks entered days as recorded and future cycles as estimated", () => {
    const { recorded, estimated } = periodDates(data);
    expect(recorded.has("2026-10-05")).toBe(true);
    expect(recorded.has("2026-10-29")).toBe(false);
    expect(estimated.has("2026-10-29")).toBe(true);
  });
  it("rejects future start dates and out-of-range lengths", () => {
    const e = validateCycle({ lastPeriodStart: "2026-12-01", cycleLength: "10", periodLength: "3" }, new Date("2026-10-24T12:00:00Z"));
    expect(e.lastPeriodStart).toBeTruthy();
    expect(e.cycleLength).toBeTruthy();
  });
});

describe("text validation", () => {
  it("rejects empty and too-long text", () => {
    expect(validateText("   ")).toBeTruthy();
    expect(validateText("a".repeat(11), { max: 10 })).toBeTruthy();
    expect(validateText("hello")).toBeNull();
  });
});
