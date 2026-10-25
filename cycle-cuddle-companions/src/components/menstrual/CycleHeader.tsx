import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { MenstrualApi, CycleHeaderResponse, ApiError, BASE_URL } from "@/services/menstrualApi";
import { Loader2, Calendar, RefreshCw, AlertCircle, Heart } from "lucide-react";

export interface CycleHeaderRef {
  refresh: () => Promise<void>;
}

interface CycleHeaderProps {
  userId: string;
}

export const CycleHeader = forwardRef<CycleHeaderRef, CycleHeaderProps>(({ userId }, ref) => {
  const [data, setData] = useState<CycleHeaderResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCycleData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await MenstrualApi.getCycleHeader(userId);
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Unable to load cycle header (${err.status}): ${err.message}`);
      } else {
        setError(`Network error: Could not reach cycle service at ${BASE_URL}.`);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useImperativeHandle(ref, () => ({
    refresh: fetchCycleData,
  }));

  useEffect(() => {
    fetchCycleData();
  }, [fetchCycleData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-card/80 backdrop-blur rounded-3xl border border-border shadow-xs">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm font-medium text-muted-foreground">Calculating live cycle phase & next bleed prediction...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
        <button
          onClick={fetchCycleData}
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-destructive/20 hover:bg-destructive/30 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <header className="p-6 bg-gradient-to-br from-rose-500/10 via-purple-500/5 to-transparent rounded-3xl border border-border/80 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary rounded-full">
              Phase: {data.current_phase.replace("_", " ")}
            </span>
            <span className="text-xs text-muted-foreground">
              Confidence: {data.confidence_percentage}% ({data.evidence_source.replace("_", " ")})
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1.5 flex items-center gap-2 text-foreground">
            Day {data.cycle_day} of Cycle
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 inline-block animate-pulse" />
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Typical cycle: {data.typical_cycle_length} days | {data.uncertainty_reason}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-background/90 border border-border px-4 py-3 rounded-2xl shadow-xs">
          <Calendar className="w-5 h-5 text-primary" />
          <div className="text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              Estimated Next Bleed Date
            </p>
            <p className="text-sm sm:text-base font-bold text-foreground">
              {data.estimated_next_bleed_date}
            </p>
          </div>
          <button
            onClick={fetchCycleData}
            title="Refresh Cycle Data"
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition ml-1"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
});

CycleHeader.displayName = "CycleHeader";
