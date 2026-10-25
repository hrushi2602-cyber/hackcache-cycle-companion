import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { MenstrualApi, DynamicWidgetResponse, ApiError } from "@/services/menstrualApi";
import { HomeScreenCardDeck } from "./HomeScreenCardDeck";
import {
  Loader2,
  Sparkles,
  MessageCircleQuestion,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  HeartHandshake,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface DynamicHomeWidgetRef {
  refresh: () => Promise<void>;
  updateData: (data: DynamicWidgetResponse) => void;
}

interface DynamicHomeWidgetProps {
  userId: string;
  onWidgetLoaded?: (widget: DynamicWidgetResponse) => void;
  onStateUpdated?: () => Promise<void> | void;
}

export const DynamicHomeWidget = forwardRef<DynamicHomeWidgetRef, DynamicHomeWidgetProps>(
  ({ userId, onWidgetLoaded, onStateUpdated }, ref) => {
    const [widget, setWidget] = useState<DynamicWidgetResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showTelemetryNote, setShowTelemetryNote] = useState<boolean>(false);

    const fetchWidget = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await MenstrualApi.getDynamicWidget(userId);
        setWidget(res);
        if (onWidgetLoaded) onWidgetLoaded(res);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Dynamic widget (${err.status}): ${err.message}`);
        } else {
          setError("Network failure: Unable to fetch home widget from FastAPI backend.");
        }
      } finally {
        setLoading(false);
      }
    }, [userId, onWidgetLoaded]);

    useImperativeHandle(ref, () => ({
      refresh: fetchWidget,
      updateData: (newData: DynamicWidgetResponse) => {
        setWidget(newData);
      },
    }));

    useEffect(() => {
      fetchWidget();
    }, [fetchWidget]);

    const handleDeckStateUpdated = async () => {
      await fetchWidget();
      if (onStateUpdated) {
        await onStateUpdated();
      }
    };

    return (
      <div className="space-y-4">
        {/* Top Mini Telemetry Pill Bar */}
        {widget && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-300/40">
                <Sparkles className="w-3 h-3 text-pink-500" />
                Live Deck Mode: {widget.widget_type}
              </span>

              {widget.is_time_decayed && (
                <span className="px-2.5 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300/30 rounded-full">
                  Decayed (&gt;18h)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTelemetryNote((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium px-2 py-0.5 rounded-lg hover:bg-muted/60 transition"
              >
                <span>Biometric Note</span>
                {showTelemetryNote ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              <button
                onClick={fetchWidget}
                title="Refresh Widget & Cycle"
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Biometric Note Banner */}
        {showTelemetryNote && widget && (
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 text-xs text-muted-foreground flex items-start gap-2.5 transition-all">
            <MessageCircleQuestion className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                Live State: {widget.evaluated_phase} • {widget.evaluated_emotion}
              </p>
              <p className="mt-0.5 italic">"{widget.display_text}"</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between text-destructive text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchWidget}
              className="px-2 py-0.5 bg-destructive/20 hover:bg-destructive/30 rounded font-semibold transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Interactive Card Deck Widget */}
        <HomeScreenCardDeck
          key={`deck-${userId}`}
          userId={userId}
          onStateUpdated={handleDeckStateUpdated}
        />
      </div>
    );
  }
);

DynamicHomeWidget.displayName = "DynamicHomeWidget";

