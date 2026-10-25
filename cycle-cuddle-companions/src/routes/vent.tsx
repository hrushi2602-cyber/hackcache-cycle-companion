import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTabNavigation } from "@/context/TabNavigationContext";
import { MenstrualHealthDashboard } from "@/components/menstrual/MenstrualHealthDashboard";

export const Route = createFileRoute("/vent")({
  head: () => ({
    meta: [
      { title: "Voice Vent · Live Menstrual Health Companion" },
      { name: "description", content: "Empathetic Groq AI voice vent companion." },
    ],
  }),
  component: VentRouteRedirect,
});

function VentRouteRedirect() {
  const { setActiveTab } = useTabNavigation();
  useEffect(() => {
    setActiveTab("chat");
  }, [setActiveTab]);

  return <MenstrualHealthDashboard />;
}
