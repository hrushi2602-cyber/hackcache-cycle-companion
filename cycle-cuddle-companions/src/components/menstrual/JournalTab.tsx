import React, { useEffect, useState, useCallback } from "react";
import { MenstrualApi, JournalSummaryResponse, ApiError, BASE_URL } from "@/services/menstrualApi";
import { Loader2, BookOpen, Sun, CloudRain, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

interface JournalTabProps {
  userId: string;
}

export const JournalTab: React.FC<JournalTabProps> = ({ userId }) => {
  const [journal, setJournal] = useState<JournalSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJournal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await MenstrualApi.getJournalSummary(userId);
      setJournal(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to load journal reflection (${err.status}): ${err.message}`);
      } else {
        setError(`Network error: Could not reach the journal service at ${BASE_URL}.`);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchJournal();
  }, [fetchJournal]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-border">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Synthesizing your cycle reflection journal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-destructive/10 border border-destructive/20 rounded-3xl flex items-start justify-between text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
        <button
          onClick={fetchJournal}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-destructive/20 hover:bg-destructive/30 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!journal) return null;

  return (
    <div className="p-6 bg-card rounded-3xl border border-border shadow-soft space-y-6">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Cycle Reflection Journal</h3>
            <p className="text-xs text-muted-foreground">Synthesized from your recent voice vents and logs</p>
          </div>
        </div>
        <button
          onClick={fetchJournal}
          title="Refresh Journal"
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strong Days Overview */}
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Sun className="w-5 h-5" />
            <h4 className="font-bold text-sm">Strong Days Overview</h4>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {journal.strong_days_overview}
          </p>
        </div>

        {/* Weak Days Overview */}
        <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <CloudRain className="w-5 h-5" />
            <h4 className="font-bold text-sm">Rest & Low Energy Days</h4>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {journal.weak_days_overview}
          </p>
        </div>
      </div>

      {/* Pattern Insight */}
      <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h4 className="font-bold text-sm">Longitudinal Pattern Insight</h4>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {journal.pattern_insight}
        </p>
      </div>
    </div>
  );
};
