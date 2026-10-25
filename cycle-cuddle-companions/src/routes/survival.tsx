import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTabNavigation } from "@/context/TabNavigationContext";
import { MenstrualHealthDashboard } from "@/components/menstrual/MenstrualHealthDashboard";

export const Route = createFileRoute("/survival")({
  head: () => ({
    meta: [
      { title: "Daily Cards · Live Menstrual Health Companion" },
      { name: "description", content: "Phase-tailored productivity, sleep, and nutrition cards." },
    ],
  }),
  component: SurvivalRouteRedirect,
});

function SurvivalRouteRedirect() {
  const { setActiveTab } = useTabNavigation();
  useEffect(() => {
    setActiveTab("home");
  }, [setActiveTab]);

  return <MenstrualHealthDashboard />;
}
