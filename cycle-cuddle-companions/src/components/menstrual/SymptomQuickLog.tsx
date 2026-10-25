import React, { useState } from "react";
import { MenstrualApi, SymptomLogPayload, ApiError } from "@/services/menstrualApi";
import { Loader2, PlusCircle, CheckCircle2, AlertCircle, Droplets, Flame, Brain, HeartCrack, BatteryLow } from "lucide-react";

interface SymptomQuickLogProps {
  userId: string;
  onWidgetRefreshRequested?: () => Promise<void> | void;
  onCycleRefreshRequested?: () => Promise<void> | void;
}

const QUICK_TAP_SYMPTOMS = [
  { id: "period_start", label: "Period Start", icon: Droplets, color: "text-rose-500" },
  { id: "cramps", label: "Cramps", icon: Flame, color: "text-orange-500" },
  { id: "anxiety", label: "Anxiety", icon: Brain, color: "text-purple-500" },
  { id: "nausea", label: "Nausea", icon: HeartCrack, color: "text-amber-500" },
  { id: "exhaustion", label: "Exhaustion", icon: BatteryLow, color: "text-blue-500" },
];

export const SymptomQuickLog: React.FC<SymptomQuickLogProps> = ({
  userId,
  onWidgetRefreshRequested,
  onCycleRefreshRequested,
}) => {
  const [selectedSymptom, setSelectedSymptom] = useState<string>("cramps");
  const [severity, setSeverity] = useState<number>(5);
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const payload: SymptomLogPayload = {
      symptom_type: selectedSymptom,
      severity,
      notes: notes.trim() ? notes.trim() : null,
    };

    try {
      const res = await MenstrualApi.logSymptom(userId, payload);
      setSuccessMessage(res.message);
      setNotes("");

      // Strict Rule: If response returns "ui_action": "REFRESH_WIDGET",
      // immediately re-fetch both GET /api/widget/{user_id} and GET /api/cycle/{user_id}
      if (res.ui_action === "REFRESH_WIDGET") {
        await Promise.all([
          onWidgetRefreshRequested ? onWidgetRefreshRequested() : Promise.resolve(),
          onCycleRefreshRequested ? onCycleRefreshRequested() : Promise.resolve(),
        ]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to log symptom (${err.status}): ${err.message}`);
      } else {
        setError("Network error: Could not reach symptom logging service. Ensure backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-card rounded-3xl border border-border shadow-soft">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">Quick-Tap Symptom Bar</h3>
        <p className="text-xs text-muted-foreground">
          Live biometric telemetry recalculates cycle phase & widget in real time
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="text-xs font-semibold px-2 py-1 bg-destructive/20 rounded-lg hover:bg-destructive/30 transition"
          >
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage} (Widget & cycle re-evaluated)</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Tap Icons */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Tap Symptom
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {QUICK_TAP_SYMPTOMS.map((s) => {
              const Icon = s.icon;
              const isSelected = selectedSymptom === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSelectedSymptom(s.id)}
                  className={`py-3 px-2 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs scale-102"
                      : "bg-muted/40 hover:bg-muted border-border text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isSelected ? "text-primary-foreground" : s.color}`} />
                  <span className="text-[11px] text-center leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity Slider */}
        <div className="p-3 bg-muted/20 rounded-2xl border border-border/50">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Severity Level
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              VAS {severity} / 10 ({severity <= 3 ? "Mild" : severity <= 6 ? "Moderate" : "Severe"})
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
          />
        </div>

        {/* Optional Notes */}
        <div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context (e.g. sharp lower back ache, took ibuprofen)..."
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transmitting Symptom Telemetry...</span>
            </>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Log & Trigger Dynamic Refresh</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
