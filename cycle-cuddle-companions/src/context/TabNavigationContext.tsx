import React, { createContext, useContext, useState, useEffect } from "react";

export type TabKey = "home" | "chat" | "meals" | "journal" | "onboarding";

interface TabNavigationContextType {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

const TabNavigationContext = createContext<TabNavigationContextType | undefined>(undefined);

export const TabNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always default to 'home' during initial render so SSR HTML and initial client hydration match identically
  const [activeTab, setActiveTabState] = useState<TabKey>("home");

  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  useEffect(() => {
    // Read and synchronize tab parameter on client mount after hydration
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") as TabKey | null;
    if (tabParam && ["home", "chat", "meals", "journal", "onboarding"].includes(tabParam)) {
      setActiveTabState(tabParam);
    }

    const handlePopState = () => {
      const updatedParams = new URLSearchParams(window.location.search);
      const updatedTab = updatedParams.get("tab") as TabKey | null;
      if (updatedTab && ["home", "chat", "meals", "journal", "onboarding"].includes(updatedTab)) {
        setActiveTabState(updatedTab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <TabNavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabNavigationContext.Provider>
  );
};

export const useTabNavigation = (): TabNavigationContextType => {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error("useTabNavigation must be used within a TabNavigationProvider");
  }
  return context;
};
