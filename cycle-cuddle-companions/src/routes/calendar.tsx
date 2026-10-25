import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTabNavigation } from "@/context/TabNavigationContext";
import { MenstrualHealthDashboard } from "@/components/menstrual/MenstrualHealthDashboard";

export const Route = createFileRoute("/calendar")({
  component: CalendarRouteRedirect,
});

function CalendarRouteRedirect() {
  const { setActiveTab } = useTabNavigation();
  useEffect(() => {
    setActiveTab("home");
  }, [setActiveTab]);

  return <MenstrualHealthDashboard />;
}
