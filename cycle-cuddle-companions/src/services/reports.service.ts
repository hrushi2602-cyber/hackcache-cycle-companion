import { symptomsService } from "./symptoms.service";

export interface SymptomCount { name: string; count: number }

export function countSymptoms(entries: { symptoms: string[] }[]): SymptomCount[] {
  const map = new Map<string, number>();
  entries.forEach((e) => e.symptoms.forEach((s) => map.set(s, (map.get(s) ?? 0) + 1)));
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export const reportsService = {
  async summary() {
    const entries = await symptomsService.list();
    return { entries, counts: countSymptoms(entries) };
  },
  /** PDF export isn't built yet — callers must show an honest message. */
  pdfDownloadAvailable: false,
};
