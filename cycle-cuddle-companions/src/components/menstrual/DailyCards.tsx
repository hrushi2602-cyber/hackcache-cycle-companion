import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { MenstrualApi, DailyDashboardResponse, ApiError, BASE_URL } from "@/services/menstrualApi";
import { Loader2, Briefcase, Moon, Utensils, AlertCircle, RefreshCw, HelpCircle } from "lucide-react";

export interface DailyCardsRef {
  refresh: () => Promise<void>;
}

interface DailyCardsProps {
  userId: string;
}

export const DailyCards = forwardRef<DailyCardsRef, DailyCardsProps>(({ userId }, ref) => {
  const [data, setData] = useState<DailyDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await MenstrualApi.getDailyDashboard(userId);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Master Dashboard error (${err.status}): ${err.message}`);
      } else {
        setError(`Network error: Could not reach recommendation engine at ${BASE_URL}.`);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useImperativeHandle(ref, () => ({
    refresh: fetchDashboard,
  }));

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card rounded-3xl border border-border">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground font-medium">Synthesizing live phase recommendations via Gemini engine...</p>
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
          onClick={fetchDashboard}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-destructive/20 hover:bg-destructive/30 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Phase-Aligned Daily Guidance</h3>
          <p className="text-xs text-muted-foreground">
            Current Phase: <span className="font-semibold capitalize text-primary">{data.current_phase.replace("_", " ")}</span> | Emotion: <span className="font-semibold text-foreground">{data.emotional_state}</span>
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          title="Regenerate cards"
          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Productivity Card */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-soft hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-foreground">Productivity Grace</h4>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {data.productivity_grace}
            </p>
          </div>
        </div>

        {/* Sleep Card */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-soft hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Moon className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-foreground">Sleep Protocol</h4>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {data.sleep_protocol}
            </p>
          </div>
        </div>

        {/* Diet Card */}
        <div className="p-5 rounded-3xl border border-border bg-card shadow-soft hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Utensils className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-foreground">Diet & Nutrition</h4>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {data.diet_tips}
            </p>
          </div>
        </div>
      </div>

      {/* Check-In Questions as strings */}
      {data.check_in_questions && data.check_in_questions.length > 0 && (
        <div className="p-5 rounded-3xl border border-border bg-muted/20 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daily Phase Check-In Prompts
            </h4>
          </div>

          <div className="space-y-2">
            {data.check_in_questions.map((prompt: string, qIdx: number) => (
              <div key={qIdx} className="p-3.5 bg-background rounded-2xl border border-border/60 flex items-start gap-3 shadow-2xs">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  {qIdx + 1}
                </span>
                <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">
                  {prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

DailyCards.displayName = "DailyCards";
