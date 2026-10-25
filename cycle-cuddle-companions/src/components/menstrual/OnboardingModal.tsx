import React, { useState } from "react";
import { MenstrualApi, UserProfilePayload, ApiError, setActiveUserId, BASE_URL } from "@/services/menstrualApi";
import { Loader2, Calendar, UserCheck, AlertCircle, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";

interface OnboardingModalProps {
  userId: string;
  onProfileCreated?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  userId,
  onProfileCreated,
}) => {
  const [lastPeriodStart, setLastPeriodStart] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [dietaryInput, setDietaryInput] = useState<string>("vegetarian, low-sodium");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const restrictions = dietaryInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload: UserProfilePayload = {
      last_period_start: lastPeriodStart,
      average_cycle_length: Number(cycleLength),
      dietary_restrictions: restrictions,
    };

    try {
      const res = await MenstrualApi.saveUserProfile(userId, payload);
      // Persist active user ID locally
      setActiveUserId(userId);
      setSuccess(res.message);

      // Strict Rule: Upon a 200 OK, trigger a full refresh of the home screen endpoints
      if (onProfileCreated) {
        onProfileCreated();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Failed to save profile (${err.status}): ${err.message}`);
      } else {
        setError(`Network error: Could not reach onboarding profile endpoint at ${BASE_URL}.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-card rounded-3xl border border-border shadow-soft max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-1.5">
            Initialize Cycle Profile
            <Sparkles className="w-4 h-4 text-primary" />
          </h3>
          <p className="text-xs text-muted-foreground">
            Sets baseline physiology parameters for live cycle calculations
          </p>
        </div>
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
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 bg-destructive/20 rounded-lg hover:bg-destructive/30 transition"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success} (Home screen re-synchronized)</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Last Period Start Date
          </label>
          <input
            type="date"
            required
            value={lastPeriodStart}
            onChange={(e) => setLastPeriodStart(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-foreground"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Average Cycle Length (Days)
          </label>
          <input
            type="number"
            min="20"
            max="45"
            required
            value={cycleLength}
            onChange={(e) => setCycleLength(Number(e.target.value))}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-foreground"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Dietary Restrictions (comma-separated)
          </label>
          <input
            type="text"
            value={dietaryInput}
            onChange={(e) => setDietaryInput(e.target.value)}
            placeholder="e.g. dairy-free, vegan, gluten-sensitive"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/40 text-foreground"
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
              <span>Initializing Live Profile...</span>
            </>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              <span>Save Profile & Sync Live Backend</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
