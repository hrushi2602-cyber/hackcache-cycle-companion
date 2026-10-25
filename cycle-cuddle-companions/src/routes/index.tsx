import { createFileRoute } from "@tanstack/react-router";
import { MenstrualHealthDashboard } from "@/components/menstrual/MenstrualHealthDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Menstrual Health & Emotional Gateway" },
      { name: "description", content: "Empathetic phase-aware cycle tracking connecting directly to live FastAPI backend." },
      { property: "og:title", content: "Menstrual Health & Emotional Gateway" },
      { property: "og:description", content: "Live cycle tracking, real-time widget transience, and empathetic voice vent companion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return <MenstrualHealthDashboard />;
}
