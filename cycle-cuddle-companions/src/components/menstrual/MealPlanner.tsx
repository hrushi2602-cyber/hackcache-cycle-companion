import React, { useEffect, useState, useCallback } from "react";
import { MenstrualApi, MealPlanResponse, RecommendedDish, ApiError, BASE_URL } from "@/services/menstrualApi";
import { Loader2, Utensils, AlertCircle, RefreshCw, Check, ShieldAlert, Sparkles } from "lucide-react";

interface MealPlannerProps {
  userId: string;
}

export const MealPlanner: React.FC<MealPlannerProps> = ({ userId }) => {
  const [data, setData] = useState<MealPlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await MenstrualApi.getMealPlan(userId);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Meal plan failed (${err.status}): ${err.message}`);
      } else {
        setError(`Network error: Could not reach meal planner service at ${BASE_URL}.`);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-card rounded-3xl border border-border">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Planning phase-tailored hostel & canteen meals...</p>
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
          onClick={fetchMeals}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-destructive/20 hover:bg-destructive/30 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 bg-card rounded-3xl border border-border shadow-soft space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Phase-Aligned Nutrition Planner</h3>
            <p className="text-xs text-muted-foreground">
              Phase: <span className="font-semibold capitalize text-primary">{data.current_phase}</span> | Symptoms: {data.detected_symptoms.join(", ") || "None"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchMeals}
          title="Refresh Meals"
          className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {data.dietary_adjustment_alert && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs sm:text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2.5 font-medium">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-500" />
          <span>{data.dietary_adjustment_alert}</span>
        </div>
      )}

      {/* Recommended Meals */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Recommended Comfort Meals
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.recommended_meals.map((dish: RecommendedDish, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-border bg-muted/20 flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-xs transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h5 className="font-bold text-sm text-foreground">{dish.name}</h5>
                  {dish.is_nausea_friendly && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      Gut Calm
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dish.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <div className="flex flex-wrap gap-1">
                  {dish.access_required.map((acc, aIdx) => (
                    <span key={aIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
                      {acc.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Foods to Avoid */}
      {data.foods_to_avoid.length > 0 && (
        <div className="p-4 bg-muted/40 rounded-2xl border border-border/60">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Foods to Pause During This Phase
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {data.foods_to_avoid.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-3">
        {data.cozy_disclaimer}
      </p>
    </div>
  );
};
