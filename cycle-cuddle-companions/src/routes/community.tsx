import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTabNavigation } from "@/context/TabNavigationContext";
import { MenstrualHealthDashboard } from "@/components/menstrual/MenstrualHealthDashboard";

export const Route = createFileRoute("/community")({
  component: CommunityRouteRedirect,
});

function CommunityRouteRedirect() {
  const { setActiveTab } = useTabNavigation();
  useEffect(() => {
    setActiveTab("chat");
  }, [setActiveTab]);

  return <MenstrualHealthDashboard />;
}
