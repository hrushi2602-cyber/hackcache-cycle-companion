import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Heart,
  Home,
  MessageCircleHeart,
  Utensils,
  BookHeart,
  Sparkles,
  Zap,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useTabNavigation, TabKey } from "@/context/TabNavigationContext";

export const ENDPOINT_TABS = [
  {
    id: "home" as TabKey,
    label: "Dashboard & Cycle",
    short: "Home",
    icon: Home,
    endpointHint: "/api/cycle",
    desc: "Cycle & Daily Cards",
  },
  {
    id: "chat" as TabKey,
    label: "Voice Vent",
    short: "Vent",
    icon: MessageCircleHeart,
    endpointHint: "/api/chat",
    desc: "Empathetic Groq AI",
  },
  {
    id: "meals" as TabKey,
    label: "Hormone Meals",
    short: "Meals",
    icon: Utensils,
    endpointHint: "/api/meals",
    desc: "Hostel Nutrition",
  },
  {
    id: "journal" as TabKey,
    label: "Cycle Reflection",
    short: "Journal",
    icon: BookHeart,
    endpointHint: "/api/journal",
    desc: "Cycle Summary",
  },
  {
    id: "onboarding" as TabKey,
    label: "Profile Settings",
    short: "Profile",
    icon: Sparkles,
    endpointHint: "/api/user/profile",
    desc: "Cycle Onboarding",
  },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="relative block h-8 w-8 rounded-full bg-sage-soft shadow-2xs">
        <span className="absolute inset-1.5 rounded-full bg-peach" />
        <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-lavender" />
        <Heart className="absolute inset-0 m-auto h-3.5 w-3.5 fill-blush text-blush animate-pulse" />
      </span>
      <div>
        <span className="font-display text-base font-semibold leading-tight tracking-tight block">
          Companion
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
          <Zap className="w-2.5 h-2.5 text-primary" /> Sub-Second Live API
        </span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { activeTab, setActiveTab } = useTabNavigation();
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#FAF7F2" }).catch(() => {});
    }
  }, []);

  const handleTabClick = (tabId: TabKey) => {
    // If not currently on the root route, navigate home first
    if (window.location.pathname !== "/") {
      router.navigate({ to: "/" });
    }
    setActiveTab(tabId);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-md p-5 md:flex justify-between">
        <div>
          <Logo />
          <nav className="mt-8 flex flex-col gap-1.5" aria-label="Main Navigation">
            {ENDPOINT_TABS.map(({ id, label, icon: Icon, desc }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={`w-full flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-200 text-left ${
                    isActive
                      ? "bg-primary/15 text-primary font-semibold shadow-2xs scale-[1.02]"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 transition-transform ${isActive ? "scale-110 text-primary" : ""}`} />
                    <div>
                      <span className="block leading-none">{label}</span>
                      <span className="text-[10px] text-muted-foreground font-normal mt-1 block">
                        {desc}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Cute Minimalist Footer Badge */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>FastAPI + Groq Live</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            All endpoints connect directly to sub-second inference models.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-border/70 bg-card/70 backdrop-blur-md px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.6rem)] md:hidden sticky top-0 z-20">
          <Logo />
          <button
            onClick={() => handleTabClick("onboarding")}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 active:scale-95 transition"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Profile</span>
          </button>
        </header>

        {/* Page Content with adequate bottom padding for mobile floating dock */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-3 sm:px-6 pb-28 pt-4 md:px-10 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>

      {/* Cute Minimalist Floating Mobile Bottom Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-2.5 inset-x-2.5 sm:inset-x-6 max-w-md mx-auto z-40 rounded-3xl border border-border/70 bg-card/92 backdrop-blur-2xl p-1.5 pb-[max(env(safe-area-inset-bottom),0.35rem)] shadow-lg shadow-black/8 md:hidden"
      >
        <div className="flex items-center justify-around gap-1">
          {ENDPOINT_TABS.map(({ id, short, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                className={`relative flex min-h-[50px] flex-1 flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                  isActive
                    ? "bg-primary/12 text-primary font-semibold"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isActive ? "scale-115 text-primary" : ""
                  }`}
                />
                <span className="text-[10px] tracking-tight leading-none font-medium">
                  {short}
                </span>

                {/* Cute active dot indicator */}
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
