import React, { useEffect, useState, useCallback } from "react";
import { MenstrualApi, NotificationDispatchResponse, PushNotification, ApiError } from "@/services/menstrualApi";
import { Loader2, Bell, AlertTriangle, Clock, RefreshCw, X } from "lucide-react";

interface NotificationBannerProps {
  userId: string;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ userId }) => {
  const [data, setData] = useState<NotificationDispatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await MenstrualApi.getNotifications(userId);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Notifications error (${err.status}): ${err.message}`);
      } else {
        setError("Network error: Could not fetch active notification dispatch from backend.");
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-3 rounded-2xl border border-border bg-card text-muted-foreground text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
        Checking notification dispatcher...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center justify-between text-destructive text-xs">
        <span>{error}</span>
        <button
          onClick={fetchNotifications}
          className="flex items-center gap-1 font-semibold underline ml-2"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const activeNotifs = data.notifications.filter((n) => !dismissedIds.has(n.notification_id));
  if (activeNotifs.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {data.immediate_alert_triggered && (
        <div className="p-2.5 bg-rose-500/15 border border-rose-400 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-bounce" />
          <span>Immediate Pain / Symptom Flare Alert Active (VAS {data.cramps_vas}/10)</span>
        </div>
      )}

      <div className="space-y-2">
        {activeNotifs.map((notif: PushNotification) => {
          const isUrgent = notif.priority === "URGENT";
          const isHigh = notif.priority === "HIGH";

          const borderClass = isUrgent
            ? "border-rose-500/50 bg-rose-500/10"
            : isHigh
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-primary/20 bg-card";

          return (
            <div
              key={notif.notification_id}
              className={`p-3.5 rounded-2xl border ${borderClass} flex items-start justify-between gap-3 shadow-xs transition`}
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-background mt-0.5">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-foreground">{notif.title}</h5>
                    <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold uppercase bg-muted text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {notif.trigger_timing}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {notif.body}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismiss(notif.notification_id)}
                title="Dismiss"
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
