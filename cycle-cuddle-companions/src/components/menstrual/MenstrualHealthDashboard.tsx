import React, { useRef, useState, useCallback } from "react";
import { CycleHeader, CycleHeaderRef } from "./CycleHeader";
import { DynamicHomeWidget, DynamicHomeWidgetRef } from "./DynamicHomeWidget";
import { NotificationBanner } from "./NotificationBanner";
import { SymptomQuickLog } from "./SymptomQuickLog";
import { DailyCards, DailyCardsRef } from "./DailyCards";
import { ChatInterface } from "./ChatInterface";
import { JournalTab } from "./JournalTab";
import { MealPlanner } from "./MealPlanner";
import { OnboardingModal } from "./OnboardingModal";
import { getActiveUserId } from "@/services/menstrualApi";
import { Sparkles, Utensils, MessageCircleHeart, BookOpen, UserCheck, Home, Zap } from "lucide-react";
import { useTabNavigation, TabKey } from "@/context/TabNavigationContext";

export const MenstrualHealthDashboard: React.FC = () => {
  // Single persistent active user ID (no demo user switcher)
  const [userId, setUserId] = useState<string>(() => getActiveUserId());
  const { activeTab, setActiveTab } = useTabNavigation();

  // References to child components for synchronized real-time live refreshes
  const widgetRef = useRef<DynamicHomeWidgetRef>(null);
  const cycleHeaderRef = useRef<CycleHeaderRef>(null);
  const dailyCardsRef = useRef<DailyCardsRef>(null);

  // Re-fetch Dynamic Home Widget in real time
  const handleWidgetRefresh = useCallback(async () => {
    if (widgetRef.current) {
      await widgetRef.current.refresh();
    }
  }, []);

  // Re-fetch Cycle Header in real time (e.g. after period start log)
  const handleCycleRefresh = useCallback(async () => {
    if (cycleHeaderRef.current) {
      await cycleHeaderRef.current.refresh();
    }
  }, []);

  // Full refresh triggered by Onboarding 200 OK
  const handleFullHomeRefresh = useCallback(async () => {
    const updatedId = getActiveUserId();
    setUserId(updatedId);
    setActiveTab("home");
    await Promise.all([
      widgetRef.current ? widgetRef.current.refresh() : Promise.resolve(),
      cycleHeaderRef.current ? cycleHeaderRef.current.refresh() : Promise.resolve(),
      dailyCardsRef.current ? dailyCardsRef.current.refresh() : Promise.resolve(),
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Cute Minimalist Top Bar */}
      <div className="border-b border-border/60 bg-card/70 backdrop-blur-md sticky top-0 z-20 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold flex items-center gap-1.5 leading-none">
                Cycle & Emotional Gateway
              </h1>
              <p className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span>Active Profile:</span>
                <span className="font-semibold text-foreground px-1.5 py-0.2 rounded-md bg-muted/60">{userId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("onboarding")}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 hover:bg-primary/20 font-medium text-primary transition flex items-center gap-1.5 active:scale-95 shadow-2xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Profile Settings</span>
          </button>
        </div>

        {/* Cute Pastel Pill Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1.5 sm:gap-2 pb-2 pt-1 overflow-x-auto no-scrollbar">
          {[
            { id: "home" as TabKey, label: "Home", icon: Home },
            { id: "chat" as TabKey, label: "Voice Vent", icon: MessageCircleHeart },
            { id: "meals" as TabKey, label: "Meal Planner", icon: Utensils },
            { id: "journal" as TabKey, label: "Reflection", icon: BookOpen },
            { id: "onboarding" as TabKey, label: "Profile", icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-3 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {activeTab === "home" && (
          <>
            {/* 1. Cycle Header (GET /api/cycle/{user_id}) */}
            <CycleHeader
              key={`cycle-${userId}`}
              ref={cycleHeaderRef}
              userId={userId}
            />

            {/* 2. Notification Banner (GET /api/notifications/{user_id}) */}
            <NotificationBanner key={`notif-${userId}`} userId={userId} />

            {/* 3. Dynamic Home Widget (GET /api/widget/{user_id}) */}
            <DynamicHomeWidget
              key={`widget-${userId}`}
              ref={widgetRef}
              userId={userId}
              onStateUpdated={handleCycleRefresh}
            />

            {/* 4. Quick-Tap Symptom Bar (POST /api/log/{user_id}/symptoms) & Master Daily Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <SymptomQuickLog
                  key={`log-${userId}`}
                  userId={userId}
                  onWidgetRefreshRequested={handleWidgetRefresh}
                  onCycleRefreshRequested={handleCycleRefresh}
                />
              </div>

              <div className="lg:col-span-2">
                <DailyCards
                  key={`daily-${userId}`}
                  ref={dailyCardsRef}
                  userId={userId}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "meals" && (
          /* 5. Phase-Specific Meal Planner (GET /api/meals/{user_id}) */
          <MealPlanner key={`meals-${userId}`} userId={userId} />
        )}

        {activeTab === "chat" && (
          /* 6. Continuous Voice Vent Chat (POST /api/chat/{user_id}) */
          <div className="max-w-3xl mx-auto">
            <ChatInterface
              key={`chat-${userId}`}
              userId={userId}
              onWidgetSilentRefresh={handleWidgetRefresh}
            />
          </div>
        )}

        {activeTab === "journal" && (
          /* 7. Dedicated Cycle Reflection Journal (GET /api/journal/{user_id}/summary) */
          <div className="max-w-3xl mx-auto">
            <JournalTab key={`journal-${userId}`} userId={userId} />
          </div>
        )}

        {activeTab === "onboarding" && (
          /* 8. Onboarding Flow (POST /api/user/{user_id}/profile) */
          <div className="max-w-xl mx-auto">
            <OnboardingModal
              userId={userId}
              onProfileCreated={handleFullHomeRefresh}
            />
          </div>
        )}
      </main>
    </div>
  );
};
