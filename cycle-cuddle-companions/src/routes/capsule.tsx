import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTabNavigation } from "@/context/TabNavigationContext";
import { MenstrualHealthDashboard } from "@/components/menstrual/MenstrualHealthDashboard";

export const Route = createFileRoute("/capsule")({
  component: CapsuleRouteRedirect,
});

function CapsuleRouteRedirect() {
  const { setActiveTab } = useTabNavigation();
  useEffect(() => {
    setActiveTab("journal");
  }, [setActiveTab]);

  return <MenstrualHealthDashboard />;
}
